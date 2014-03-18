<?xml version="1.0"?>
<!--

  Copyright 2014 Roland Bouman

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

-->    
<xsl:stylesheet
    version="1.0" 
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:sql="urn:schemas-microsoft-com:xml-sql"
    xmlns:a="urn:schemas-microsoft-com:xml-analysis"
    xmlns:rs="urn:schemas-microsoft-com:xml-analysis:rowset"
    xmlns:md="urn:schemas-microsoft-com:xml-analysis:mddataset"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
    xmlns:EX="urn:schemas-microsoft-com:xml-analysis:exception"
>

<xsl:output
    method="html"
    omit-xml-declaration="yes"
/>

<xsl:param name="param-render" select="'document'"/>
<xsl:param name="param-id-prefix"/>

<xsl:template name="driller">
    <xsl:param name="member"/>
    <xsl:param name="tuple"/>
    <xsl:param name="expanded"/>
    <xsl:variable name="members" select="$tuple/md:Member"/>
    <xsl:variable name="num-members" select="count($members)"/>
    <xsl:variable name="tuple-members">[<xsl:for-each select="$members">'<xsl:value-of select="md:UName/text()"/>'<xsl:if test="position()!=$num-members">,</xsl:if></xsl:for-each>]</xsl:variable>
    <span class="olap-driller">
        <xsl:attribute name="onclick">drill(<xsl:value-of select="$tuple-members"/>,<xsl:value-of select="$member - 1"/>,<xsl:value-of select="$expanded"/>)</xsl:attribute>
        <xsl:choose>
            <xsl:when test="$expanded">-</xsl:when>
            <xsl:otherwise>+</xsl:otherwise>
        </xsl:choose>
    </span>
</xsl:template>

<xsl:template name="min-level">
	<xsl:param name="members"/>
	<xsl:param name="level-number" select="number('0')"/>

	<xsl:variable
		name="level-members"
		select="
            $members[
                number(md:LNum/text()) = $level-number
            ]
        "
    />

	<xsl:choose>
		<xsl:when test="$level-members">
			<xsl:value-of select="$level-number"/>
		</xsl:when>
		<xsl:otherwise>
			<xsl:call-template name="min-level">
				<xsl:with-param name="members" select="$members"/>
				<xsl:with-param name="level-number" select="$level-number + 1"/>
			</xsl:call-template>
		</xsl:otherwise>
	</xsl:choose>
</xsl:template>

<xsl:template name="max-level">
	<xsl:param name="members"/>
	<xsl:param name="level-number" select="number('0')"/>

	<xsl:variable
		name="level-members"
		select="
            $members[
                number(md:LNum/text()) &gt;= $level-number
            ]
        "
    />

	<xsl:choose>
		<xsl:when test="$level-members">
			<xsl:call-template name="max-level">
				<xsl:with-param name="members" select="$level-members"/>
				<xsl:with-param name="level-number" select="$level-number + 1"/>
			</xsl:call-template>
		</xsl:when>
		<xsl:otherwise>
			<xsl:value-of select="$level-number - 1"/>
		</xsl:otherwise>
	</xsl:choose>
</xsl:template>

<xsl:template name="depth">
    <xsl:param name="members"/>
    <xsl:param name="member-position"/>
    <xsl:param name="prev-member-position" select="$member-position - 1"/>
    <xsl:param name="depth" select="0"/>

    <xsl:variable name="prev-member" select="$members[$prev-member-position]"/>
    
    <xsl:choose>
        <xsl:when test="$prev-member">
            <xsl:variable name="member" select="$members[$member-position]"/>
            <xsl:variable name="member-level" select="number($member/md:LNum/text())"/>
            <xsl:variable name="prev-member-level" select="number($prev-member/md:LNum/text())"/>

            <xsl:choose>
                <xsl:when test="$member-level &lt;= $prev-member-level">
                    <xsl:call-template name="depth">
                        <xsl:with-param name="members" select="$members"/>
                        <xsl:with-param name="member-position" select="$member-position"/>
                        <xsl:with-param name="prev-member-position" select="$prev-member-position - 1"/>
                        <xsl:with-param name="depth" select="$depth"/>
                    </xsl:call-template>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:call-template name="depth">
                        <xsl:with-param name="members" select="$members"/>
                        <xsl:with-param name="member-position" select="$prev-member-position"/>
                        <xsl:with-param name="depth" select="$depth + 1"/>
                    </xsl:call-template>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="$depth"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:template name="level-count">
	<xsl:param name="members"/>
	<xsl:param name="level-number" select="number('0')"/>
	<xsl:param name="level-count" select="number('0')"/>

	<xsl:variable
		name="level-members"
		select="
            $members[
                number(md:LNum/text()) &gt;= $level-number
            ]
        "
    />
	<xsl:variable
		name="at-this-level"
    >
		<xsl:choose>
			<xsl:when test="$level-members[number(md:LNum/text()) = $level-number]">1</xsl:when>
			<xsl:otherwise>0</xsl:otherwise>
		</xsl:choose>
	</xsl:variable>

	<xsl:choose>
		<xsl:when test="$level-members">
			<xsl:call-template name="level-count">
				<xsl:with-param name="members" select="$level-members"/>
				<xsl:with-param name="level-number" select="$level-number + 1"/>
				<xsl:with-param name="level-count" select="$level-count + number($at-this-level)"/>
			</xsl:call-template>
		</xsl:when>
		<xsl:otherwise>
			<xsl:value-of select="$level-count"/>
		</xsl:otherwise>
	</xsl:choose>
</xsl:template>

<xsl:template name="content">
    <xsl:choose>
        <xsl:when test="//md:OlapInfo">
            <xsl:call-template name="md"/>
        </xsl:when>
        <xsl:when test="//SOAP-ENV:Fault">
            <xsl:call-template name="error"/>
        </xsl:when>
    </xsl:choose>
</xsl:template>

<xsl:template match="/">
    <xsl:choose>
        <xsl:when test="$param-render = 'document'">
            <html>
                <head>
                    <title></title>
                    <link type="text/css" rel="stylesheet" href="../css/qbm-pivot.css"/>
                </head>
                <body>
                    <xsl:call-template name="content"/>
                </body>
            </html>
        </xsl:when>
        <xsl:otherwise>
            <xsl:call-template name="content"/>
        </xsl:otherwise>
    </xsl:choose>    
</xsl:template>

<xsl:template name="error">
    <xsl:for-each select="//SOAP-ENV:Fault">
        <div style="border-style: solid; border-color:red">
            <xsl:value-of select="faultactor/text()"/>
            - <xsl:value-of select="faultcode/text()"/>
            - <xsl:value-of select="faultstring/text()"/>            
            <div><xsl:value-of select="detail"/></div>
        </div>
    </xsl:for-each>
</xsl:template>

<xsl:variable name="column-axis-name" select="'Axis0'"/>
<xsl:variable name="column-hierarchies" select="//md:AxisInfo[@name=$column-axis-name]/md:HierarchyInfo"/>
<xsl:variable name="column-hierarchy-count" select="count($column-hierarchies)"/>
<xsl:variable name="column-tuples" select="//md:Axis[@name=$column-axis-name]/md:Tuples/md:Tuple"/>
<xsl:variable name="column-tuple-count" select="count($column-tuples)"/>
<xsl:variable name="column-members" select="$column-tuples/md:Member"/>
    
<xsl:variable name="row-axis-name" select="'Axis1'"/>
<xsl:variable name="row-hierarchies" select="//md:AxisInfo[@name=$row-axis-name]/md:HierarchyInfo"/>
<xsl:variable name="row-hierarchy-count" select="count($row-hierarchies)"/>
<xsl:variable name="row-tuples" select="//md:Axis[@name=$row-axis-name]/md:Tuples/md:Tuple"/>

<xsl:variable name="cells" select="//md:CellData/md:Cell"/>

<xsl:template name="row-header-span">
    <xsl:param name="col-span" select="0"/>
    <xsl:param name="hierarchy-position" select="1"/>
    <xsl:variable name="row-hierarchy" select="$row-hierarchies[$hierarchy-position]"/>
    <xsl:choose>
        <xsl:when test="$row-hierarchy">
            <xsl:variable name="row-hierarchy-name" select="$row-hierarchy/@name"/>
            <xsl:variable name="row-hierarchy-level-count">
                <xsl:call-template name="level-count">
                    <xsl:with-param name="members" select="$row-tuples/md:Member[@Hierarchy = $row-hierarchy-name]"/>
                </xsl:call-template>  
            </xsl:variable>
            <xsl:call-template name="row-header-span">
                <xsl:with-param name="col-span" select="1 + $col-span + $row-hierarchy-level-count"/>
                <xsl:with-param name="hierarchy-position" select="$hierarchy-position + 1"/>
            </xsl:call-template>
        </xsl:when>
        <xsl:otherwise><xsl:value-of select="$col-span"/></xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:variable name="row-header-span">
    <xsl:call-template name="row-header-span"/>
</xsl:variable>

<xsl:template name="md">
    <table 
        cellpadding="2" 
        cellspacing="0" 
        class="olap-table"
    >
        <tbody>
            <xsl:call-template name="column-hierarchy"/>
            <xsl:choose>
                <xsl:when test="$row-tuples">
                    <!-- 
                    
                        This is the normal case: we have a row axis
                    
                    -->
                    <xsl:call-template name="rows"/>
                </xsl:when>
                <xsl:otherwise>
                    <tr>
                        <!-- 
                        
                            This is the odd case: no row axis, only column axis
                        
                        -->
                        <td class="olap-header-cell olap-column-header-cell2 olap-header-cell-gradient olap-header-cell-hierarchy">
                            <!--
                                Rows
                            -->
                        </td>
                        <td class="drop-zone rows-drop-zone" id="rows">
                            <xsl:attribute name="id"><xsl:value-of select="concat($param-id-prefix, '_rows')"/></xsl:attribute>
                            &#160;
                        </td>
                        <td class="olap-header-cell olap-column-header-cell2 olap-header-cell-gradient olap-header-cell-hierarchy">
                            &#160;
                        </td>
                        <xsl:call-template name="cells"/>   
                    </tr>
                </xsl:otherwise>
            </xsl:choose>
		</tbody>
	</table>
</xsl:template>
	    
<xsl:template name="column-hierarchy">
	<xsl:param name="hierarchy-number" select="number('1')"/>

	<xsl:variable name="hierarchy-name" select="$column-hierarchies[$hierarchy-number]/@name"/>

	<xsl:if test="$hierarchy-name">
        <xsl:variable name="hierarchy-members" select="$column-members[@Hierarchy = $hierarchy-name]"/>
        <xsl:variable name="max-level">
            <xsl:call-template name="max-level">
                <xsl:with-param name="members" select="$hierarchy-members"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="min-level">
            <xsl:call-template name="min-level">
                <xsl:with-param name="members" select="$hierarchy-members"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:variable name="level-count">
            <xsl:call-template name="level-count">
                <xsl:with-param name="members" select="$hierarchy-members"/>
            </xsl:call-template>
        </xsl:variable>
        <xsl:call-template name="column-levels">
			<xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
			<xsl:with-param name="hierarchy-name" select="$hierarchy-name"/>
			<xsl:with-param name="hierarchy-members" select="$hierarchy-members"/>
			<xsl:with-param name="level-count" select="$level-count"/>
			<xsl:with-param name="max-level" select="$max-level"/>
			<xsl:with-param name="min-level" select="$min-level"/>
        </xsl:call-template>
        <!--
        
            The next row is for the column drop zone row that appears
            after each hierarchy block in the column headers section
            
        -->
        <tr>
            <!--
                This piece of code creates an empty cell for the left top part of the tables
            -->
            <xsl:if test="$hierarchy-number != $column-hierarchy-count or $row-hierarchy-count=0">
                <td>
                    <xsl:attribute name="colspan">
                        <xsl:choose>
                            <xsl:when test="$row-header-span='0'">2</xsl:when>
                            <xsl:otherwise><xsl:value-of select="$row-header-span"/></xsl:otherwise>
                        </xsl:choose>
                    </xsl:attribute> 
                </td>
            </xsl:if>
            <!--
                This is the actual column drop zone cell.
            -->
            <td class="drop-zone columns-drop-zone">
                <xsl:attribute name="id"><xsl:value-of select="concat($param-id-prefix, '_', $hierarchy-name)"/></xsl:attribute>
                <xsl:attribute name="colspan">
                    <xsl:value-of select="1 + count($column-tuples)"/>
                </xsl:attribute>
                &#160;
            </td>
        </tr>
        
        <xsl:call-template name="column-hierarchy">
			<xsl:with-param name="hierarchy-number" select="$hierarchy-number + 1"/>			
		</xsl:call-template>
	</xsl:if>
</xsl:template>

<xsl:template name="member-path">
    <xsl:param name="tuple"/>
    <xsl:param name="member-uname"/>
    <xsl:param name="hierarchy-number" select="1"/>
    <xsl:param name="path" select="''"/>
    <xsl:variable name="member-uname-at-hierarchy-number" select="$tuple/md:Member[$hierarchy-number]/md:UName/text()"/>
    <xsl:variable name="new-path" select="concat($path,$member-uname-at-hierarchy-number)"/>
    <xsl:choose>
        <xsl:when test="$member-uname-at-hierarchy-number = $member-uname">
            <xsl:value-of select="$new-path"/>
        </xsl:when>
        <xsl:otherwise>
            <xsl:call-template name="member-path">
                <xsl:with-param name="tuple" select="$tuple"/>
                <xsl:with-param name="member-uname" select="$member-uname"/>
                <xsl:with-param name="hierarchy-number" select="$hierarchy-number + 1"/>
                <xsl:with-param name="path" select="$new-path"/>
            </xsl:call-template>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:template name="column-levels">
	<xsl:param name="hierarchy-number"/>
	<xsl:param name="hierarchy-name"/>
	<xsl:param name="hierarchy-members"/>
	<xsl:param name="level-count"/>
    <xsl:param name="max-level"/>
    <xsl:param name="min-level"/>
	<xsl:param name="level-number" select="number('0')"/>
    
    <xsl:variable name="members-at-level" select="$hierarchy-members[number(md:LNum/text()) = $level-number]"/>
    <xsl:variable name="members-beyond-level" select="$hierarchy-members[number(md:LNum/text()) &gt; $level-number]"/>
        
    <xsl:if test="$members-at-level">
        <tr>
            <xsl:choose>
                <xsl:when test="$row-tuples">
                    <xsl:for-each select="$row-hierarchies">
                        <xsl:variable name="row-hierarchy-position" select="position()"/>
                        <xsl:variable name="row-hierarchy-name" select="@name"/>
                        <xsl:variable 
                            name="row-hierarchy-captions"
                            select="
                                $hierarchy-number = $column-hierarchy-count
                            and $level-number = $max-level
                            "
                        />
                        <xsl:variable name="level-count1">
                            <xsl:call-template name="level-count">
                                <xsl:with-param name="members" select="$row-tuples/md:Member[@Hierarchy = $row-hierarchy-name]"/>
                            </xsl:call-template>  
                        </xsl:variable>
                        <xsl:variable name="level-count1-increment">
                            <xsl:choose>
                                <xsl:when test="$row-hierarchy-captions">0</xsl:when>
                                <xsl:otherwise>1</xsl:otherwise>
                            </xsl:choose>
                        </xsl:variable>
                        <td>
                            <xsl:attribute name="colspan">
                                <xsl:value-of select="$level-count1 + $level-count1-increment"/>
                            </xsl:attribute>
                            <xsl:choose>
                                <xsl:when
                                    test="$row-hierarchy-captions"
                                >
                                    <!--
                                    
                                        These are the hierarchy names for the row headers
                                    
                                    -->
                                    <xsl:attribute name="rowspan">2</xsl:attribute>
                                    <xsl:attribute name="class">olap-header-cell olap-column-header-cell2 olap-header-cell-gradient olap-header-cell-hierarchy</xsl:attribute>
                                    <xsl:value-of select="$row-hierarchy-name"/>
                                </xsl:when>
                            </xsl:choose>                    
                        </td>
                        <xsl:if test="$row-hierarchy-captions">
                            <td class="drop-zone rows-drop-zone">
                                <xsl:attribute name="id"><xsl:value-of select="concat($param-id-prefix, '_', $row-hierarchy-name)"/></xsl:attribute>
                                <xsl:attribute name="rowspan">
                                    <xsl:value-of select="2 + count($row-tuples)"/>
                                </xsl:attribute>
                                &#160;
                            </td>
                        </xsl:if>
                    </xsl:for-each>
                </xsl:when>
                <xsl:otherwise>
                    <td colspan="2">&#160;</td>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:choose>
                <xsl:when test="$level-number = $min-level">
                    <!--
                    
                        These are the cells with the hierarchy names for the column headers
                    
                    -->
                    <td class="olap-header-cell-hierarchy olap-header-cell olap-column-header-cell2 olap-header-cell-gradient">
                        <xsl:value-of select="$hierarchy-name"/>
                    </td>                
                </xsl:when>
                <xsl:otherwise>
                    <td class="olap-header-cell olap-column-header-cell4">&#160;</td>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:for-each select="$hierarchy-members">
                <xsl:variable name="member-position" select="position()"/>
                <xsl:variable name="member-level" select="number(md:LNum/text())"/>
                <xsl:variable name="member-uname" select="md:UName/text()"/>
                <xsl:variable name="tuple" select=".."/>
                <td>
                    <xsl:if test="$column-tuple-count = $member-position">
                        <xsl:attribute name="style">
                            border-right-style: solid;
                        </xsl:attribute>
                    </xsl:if>
                    <xsl:choose>
                        <xsl:when test="$member-level = $level-number">
                            <xsl:variable name="join-cells">
                                <xsl:choose>
                                    <xsl:when 
                                        test="
                                            $level-number = $max-level
                                        and $member-uname = $hierarchy-members[$member-position - 1]/md:UName/text()
                                        "
                                    >yes</xsl:when>
                                    <xsl:otherwise>no</xsl:otherwise>
                                </xsl:choose>
                            </xsl:variable>
                            <xsl:attribute name="class">olap-header-cell olap-header-cell-gradient
                                <xsl:choose>
                                    <xsl:when test="$join-cells = 'yes'">olap-column-header-cell1</xsl:when>
                                    <xsl:otherwise>olap-column-header-cell2</xsl:otherwise>
                                </xsl:choose>
                            </xsl:attribute>
                            <xsl:choose>
                                <xsl:when test="$join-cells = 'yes'"></xsl:when>
                                <xsl:otherwise>
                                    <xsl:variable name="member-path">
                                        <xsl:call-template name="member-path">
                                            <xsl:with-param name="tuple" select="$tuple"/>
                                            <xsl:with-param name="member-uname" select="$member-uname"/>
                                        </xsl:call-template>
                                    </xsl:variable>
                                    <xsl:variable name="members-beyond-level-with-same-ancestor">                                    
                                        <xsl:for-each select="$members-beyond-level[substring(md:UName/text(), 1, string-length($member-uname)) = $member-uname]">
                                            <xsl:variable name="member-beyond-level-path">
                                                <xsl:call-template name="member-path">
                                                    <xsl:with-param name="tuple" select=".."/>
                                                    <xsl:with-param name="member-uname" select="md:UName/text()"/>
                                                </xsl:call-template>
                                            </xsl:variable>
                                            <xsl:if test="substring($member-beyond-level-path, 1, string-length($member-path)) = $member-path">Y</xsl:if>
                                        </xsl:for-each>
                                    </xsl:variable>
                                    <xsl:call-template name="driller">
                                        <xsl:with-param name="tuple" select="$tuple"/>
                                        <xsl:with-param name="member" select="$hierarchy-number"/>
                                        <xsl:with-param name="expanded" select="contains($members-beyond-level-with-same-ancestor,'Y')"/>
                                    </xsl:call-template>
                                    <xsl:value-of select="md:Caption/text()"/>
                                </xsl:otherwise>
                            </xsl:choose>                            
                        </xsl:when>
                        <xsl:when test="$member-level &gt; $level-number">
                            <!-- 
                            
                                These are the empty column header cells in the horizontal direction
                            
                            -->
                            <xsl:attribute name="class">olap-header-cell olap-column-header-cell3 olap-header-cell-gradient</xsl:attribute>
                            &#160;
                        </xsl:when>
                        <xsl:when test="$member-level &lt; $level-number">
                            <!-- 
                            
                                These are the empty column header cells in the vertical direction
                            
                            -->
                            <xsl:attribute name="class">olap-header-cell olap-column-header-cell4</xsl:attribute>                            
                            &#160;
                        </xsl:when>
                        <xsl:otherwise>
                            shouldn't arrive here
                        </xsl:otherwise>
                    </xsl:choose>
                </td>
            </xsl:for-each>
        </tr>
    </xsl:if>
    <xsl:if test="$members-beyond-level">
        <xsl:call-template name="column-levels">
            <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
            <xsl:with-param name="hierarchy-name" select="$hierarchy-name"/>
            <xsl:with-param name="hierarchy-members" select="$hierarchy-members"/>
            <xsl:with-param name="level-count" select="$level-count"/>
            <xsl:with-param name="max-level" select="$max-level"/>
            <xsl:with-param name="min-level" select="$min-level"/>
            <xsl:with-param name="level-number" select="$level-number + 1"/>
        </xsl:call-template>
    </xsl:if>
</xsl:template>

<xsl:template name="member-and-predecessors">
    <xsl:param name="members"/>
    <xsl:param name="member-position"/>
    <xsl:param name="list" select="''"/>
    <xsl:variable name="member" select="$members[$member-position]"/>
    <xsl:choose>
        <xsl:when test="$member">
            <xsl:call-template name="member-and-predecessors">
                <xsl:with-param name="members" select="$members"/>
                <xsl:with-param name="member-position" select="$member-position - 1"/>
                <xsl:with-param name="list" select="concat($member/md:UName/text(), '/', $list)"/>
            </xsl:call-template>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="$list"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:template name="spacer">
    <xsl:param name="width"/>
    <xsl:param name="spacer" select="''"/>
    <xsl:param name="num-spaces" select="number('0')"/>
    <xsl:choose>
        <xsl:when test="$num-spaces = $width">
            <xsl:copy-of select="$spacer"/>
        </xsl:when>
        <xsl:otherwise>
            <xsl:call-template name="spacer">
                <xsl:with-param name="width" select="$width"/>
                <xsl:with-param name="spacer">
                    <xsl:copy-of select="$spacer"/>
                    <td class="olap-header-cell olap-vertical-space">
                        &#160;
                    </td>
                </xsl:with-param>
                <xsl:with-param name="num-spaces" select="$num-spaces + 1"/>
            </xsl:call-template>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:template name="rows">
    <xsl:for-each select="$row-tuples">
        <xsl:variable name="row-tuple-position" select="position()"/>
        <xsl:variable name="row-members" select="md:Member"/>        
        <tr>
            <xsl:for-each select="$row-hierarchies">
                <xsl:variable name="row-hierarchy-position" select="position()"/>
                <xsl:variable name="member" select="$row-members[$row-hierarchy-position]"/>
                <xsl:variable name="member-uname" select="$member/md:UName/text()"/>
                <xsl:variable name="prev-tuple" select="$row-tuples[$row-tuple-position - 1]"/>
                <xsl:variable name="hierarchy-members" select="$row-tuples/md:Member[$row-hierarchy-position]"/>
                <xsl:variable name="members-beyond-level" select="$hierarchy-members[number(md:LNum/text()) &gt; number($member/md:LNum/text())]"/>
                <xsl:variable name="join-cells">
                    <xsl:choose>
                        <xsl:when 
                            test="
                                $member-uname = $prev-tuple/md:Member[$row-hierarchy-position]/md:UName/text()
                            "
                        >
                            <xsl:variable name="member-and-predecessors">
                                <xsl:call-template name="member-and-predecessors">
                                    <xsl:with-param name="members" select="$row-members"/>
                                    <xsl:with-param name="member-position" select="$row-hierarchy-position"/>
                                </xsl:call-template>
                            </xsl:variable>
                            <xsl:variable name="next-member-and-predecessors">
                                <xsl:call-template name="member-and-predecessors">
                                    <xsl:with-param name="members" select="$prev-tuple/md:Member"/>
                                    <xsl:with-param name="member-position" select="$row-hierarchy-position"/>
                                </xsl:call-template>
                            </xsl:variable>
                            <xsl:choose>
                                <xsl:when test="$member-and-predecessors = $next-member-and-predecessors">yes</xsl:when>
                                <xsl:otherwise>no</xsl:otherwise>
                            </xsl:choose>
                        </xsl:when>
                        <xsl:otherwise>no</xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="depth">
                    <xsl:call-template name="depth">
                        <xsl:with-param name="members" select="$hierarchy-members"/>
                        <xsl:with-param name="member-position" select="$row-tuple-position"/>
                    </xsl:call-template>  
                </xsl:variable>
                <xsl:variable name="level-count">
                    <xsl:call-template name="level-count">
                        <xsl:with-param name="members" select="$hierarchy-members"/>
                    </xsl:call-template>  
                </xsl:variable>                
                <xsl:variable name="colspan-increment">
                    <xsl:choose>
                        <xsl:when test="$row-hierarchy-position = $row-hierarchy-count">0</xsl:when>
                        <xsl:otherwise>0</xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:if test="$depth!=0">
                    <xsl:call-template name="spacer">
                        <xsl:with-param name="width" select="$depth"/>
                    </xsl:call-template>
                </xsl:if>
                <td>
                    <xsl:attribute name="colspan">
                        <xsl:value-of select="($level-count - $depth) + number($colspan-increment)"/>
                    </xsl:attribute>
                    <xsl:attribute name="class">olap-header-cell 
                        <xsl:if test="$join-cells = 'no'">
                            olap-header-cell-gradient
                            olap-column-header-cell2
                        </xsl:if>
                    </xsl:attribute>
                    <xsl:if test="$join-cells = 'no'">                 
                        <xsl:variable name="tuple" select="$member/.."/>
                        <xsl:variable name="member-path">
                            <xsl:call-template name="member-path">
                                <xsl:with-param name="tuple" select="$tuple"/>
                                <xsl:with-param name="member-uname" select="$member-uname"/>
                            </xsl:call-template>
                        </xsl:variable>
                        
                        <xsl:variable name="members-beyond-level-with-same-ancestor">                                    
                            <xsl:for-each select="$members-beyond-level[substring(md:UName/text(), 1, string-length($member-uname)) = $member-uname]">
                                <xsl:variable name="member-beyond-level-path">
                                    <xsl:call-template name="member-path">
                                        <xsl:with-param name="tuple" select=".."/>
                                        <xsl:with-param name="member-uname" select="md:UName/text()"/>
                                    </xsl:call-template>
                                </xsl:variable>
                                <xsl:if test="substring($member-beyond-level-path, 1, string-length($member-path)) = $member-path">Y</xsl:if>
                            </xsl:for-each>
                        </xsl:variable>
                        
                        <xsl:call-template name="driller">
                            <xsl:with-param name="tuple" select="$tuple"/>
                            <xsl:with-param name="member" select="$row-hierarchy-position"/>
                            <xsl:with-param name="expanded" select="contains($members-beyond-level-with-same-ancestor, 'Y')"/>
                        </xsl:call-template>
                        <xsl:value-of select="$member/md:Caption/text()"/>
                    </xsl:if>
                </td>
                <xsl:if test="$row-hierarchy-position = $row-hierarchy-count">
                    <td class="olap-header-cell"></td>
                </xsl:if>
            </xsl:for-each>
            <xsl:call-template name="cells">
                <xsl:with-param name="row-tuple-position" select="$row-tuple-position"/>
            </xsl:call-template>
        </tr>
    </xsl:for-each>
</xsl:template>

<xsl:template name="cells">
    <xsl:param name="row-tuple-position" select="1"/>
    <xsl:for-each select="$column-tuples">
        <xsl:variable name="column-tuple-position" select="position()"/>
        <xsl:variable name="cell-ordinal" select="($row-tuple-position - 1) * $column-tuple-count + $column-tuple-position - 1"/>
        <xsl:variable name="cell" select="$cells[@CellOrdinal = $cell-ordinal]"/>
        <td class="olap-data-cell">
            <xsl:value-of select="$cell/md:FmtData/text()"/>
            <xsl:value-of select="$cell/md:FmtValue/text()"/>
        </td>
    </xsl:for-each>
</xsl:template>

</xsl:stylesheet>
