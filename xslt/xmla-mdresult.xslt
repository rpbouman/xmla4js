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

<!-- 
    @param param_render default 'document'
    If this is 'document' the output will be a complete HTML document
    Otherwise, only the <table> element for the pivot table is generated.
-->
<xsl:param name="param-render" select="'document'"/>
<xsl:param name="flip-axes" select="'no'"/>

<xsl:variable name="vertical-axis">
    <xsl:choose>
        <xsl:when test="$flip-axes='no'">Axis1</xsl:when>
        <xsl:when test="$flip-axes='yes'">Axis0</xsl:when>
    </xsl:choose>
</xsl:variable>

<xsl:variable name="horizontal-axis">
    <xsl:choose>
        <xsl:when test="$flip-axes='no'">Axis0</xsl:when>
        <xsl:when test="$flip-axes='yes'">Axis1</xsl:when>
    </xsl:choose>
</xsl:variable>

<xsl:variable name="axes-info" select="//md:OlapInfo/md:AxesInfo/md:AxisInfo"/>
<xsl:variable name="axes" select="//md:Axes/md:Axis"/>

<xsl:template name="driller">
    <xsl:param name="member"/>
    <xsl:param name="tuple"/>
    <xsl:param name="expanded"/>
    <xsl:variable name="members" select="$tuple/md:Member"/>
    <xsl:if test="$members[$member][@Hierarchy!='Measures']">
        <xsl:variable name="num-members" select="count($members)"/>
        <xsl:variable name="tuple-members">[<xsl:for-each select="$members">'<xsl:value-of select="md:UName/text()"/>'<xsl:if test="position()!=$num-members">,</xsl:if></xsl:for-each>]</xsl:variable>
        <span class="driller">            
            <xsl:attribute name="onclick">drill(<xsl:value-of select="$tuple-members"/>,<xsl:value-of select="$member - 1"/>,<xsl:value-of select="$expanded"/>)</xsl:attribute>
            <xsl:choose>
                <xsl:when test="$expanded">-</xsl:when>
                <xsl:otherwise>+</xsl:otherwise>
            </xsl:choose></span>
    </xsl:if>
</xsl:template>

<xsl:template name="member-path">
    <xsl:param name="axis-tuple"/>
    <xsl:param name="hierarchy-number"/>
    <xsl:param name="path" select="''"/>
    <xsl:param name="index" select="1"/>
    <xsl:choose>
        <xsl:when test="$hierarchy-number &gt;= $index">
            <xsl:call-template name="member-path">
                <xsl:with-param name="axis-tuple" select="$axis-tuple"/>
                <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                <xsl:with-param name="path" select="concat($path, '/', $axis-tuple/md:Member[$index]/md:UName)"/>
                <xsl:with-param name="index" select="$index + 1"/>
            </xsl:call-template>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="$path"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:template name="num-levels-after">
    <xsl:param name="members-beyond-level"/>
    <xsl:param name="hierarchy-level"/>
    <xsl:param name="num-levels-after" select="0"/>
    <xsl:variable name="next-hierarchy-level" select="$hierarchy-level + 1"/>
    <xsl:choose>
        <xsl:when test="$members-beyond-level">
            <xsl:call-template name="num-levels-after">
                <xsl:with-param name="members-beyond-level" select="$members-beyond-level[number(md:LNum/text()) &gt; $next-hierarchy-level]"/>
                <xsl:with-param name="hierarchy-level" select="$next-hierarchy-level"/>
                <xsl:with-param name="num-levels-after" select="$num-levels-after + 1"/>
            </xsl:call-template>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="$num-levels-after"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:template name="count-all-levels">
    <xsl:param name="axis-name"/>
    <xsl:param name="hierarchy-number" select="1"/>
    <xsl:param name="level-count" select="0"/>
    <xsl:param name="axis-hierarchies-info" select="$axes-info[@name=$axis-name]/md:HierarchyInfo"/>
    <xsl:param name="axis-members" select="$axes[@name=$axis-name]/md:Tuples/md:Tuple/md:Member"/>
    <xsl:variable name="hierarchy-name" select="$axis-hierarchies-info[$hierarchy-number]/@name"/>
    <xsl:variable name="hierarchy-members" select="$axis-members[@Hierarchy=$hierarchy-name]"/>
    <xsl:variable name="num-levels">   
        <xsl:call-template name="num-levels-after">
            <xsl:with-param name="members-beyond-level" select="$hierarchy-members"/>
            <xsl:with-param name="hierarchy-level" select="-1"/>
        </xsl:call-template>
    </xsl:variable>
    <xsl:choose>
        <xsl:when test="$hierarchy-name">
            <xsl:call-template name="count-all-levels">
                <xsl:with-param name="axis-name" select="$axis-name"/>
                <xsl:with-param name="hierarchy-number" select="$hierarchy-number + 1"/>
                <xsl:with-param name="level-count" select="$level-count + number($num-levels)"/>
            </xsl:call-template>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="$level-count"/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>

<xsl:template match="/">
    <xsl:choose>
        <xsl:when test="$param-render = 'document'">
            <html>
                <head>
                    <title></title>
                    <link rel="stylesheet" type="text/css" href="../css/pivot-table.css"/>
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

<xsl:template name="content">
    <table class="pivot" cellpadding="0" cellspacing="0">
        <thead>
            <xsl:call-template name="horizontal"/>
        </thead>
        <tbody>
            <xsl:call-template name="vertical"/>
        </tbody>        
    </table>
</xsl:template>

<xsl:template name="horizontal">
    <xsl:variable name="axis-hierarchies-info" select="$axes-info[@name=$horizontal-axis]/md:HierarchyInfo"/>
    <xsl:variable name="axis-tuples" select="$axes[@name=$horizontal-axis]/md:Tuples/md:Tuple"/>
    
    <xsl:for-each select="$axis-hierarchies-info">
        <xsl:variable name="hierarchy-name" select="@name"/>
        <xsl:variable name="hierarchy-members" select="$axis-tuples/md:Member[@Hierarchy=$hierarchy-name]"/>
        <xsl:call-template name="horizontal-hierarchy-levels">
            <xsl:with-param name="axis-tuples" select="$axis-tuples"/>
            <xsl:with-param name="hierarchy-members" select="$hierarchy-members"/>
            <xsl:with-param name="hierarchy-number" select="position()"/>
            <xsl:with-param name="hierarchy-name" select="$hierarchy-name"/>
        </xsl:call-template>
    </xsl:for-each>
</xsl:template>

<xsl:template name="horizontal-hierarchy-levels">
    <xsl:param name="axis-tuples"/>
    <xsl:param name="hierarchy-members"/>
    <xsl:param name="hierarchy-number"/>
    <xsl:param name="hierarchy-name"/>
    <xsl:param name="hierarchy-level" select="0"/>
    <xsl:variable name="hierarchy-level-members" select="$hierarchy-members[number(md:LNum/text()) = $hierarchy-level]"/>
    <xsl:variable name="members-beyond-level" select="$hierarchy-members[number(md:LNum/text()) &gt; $hierarchy-level]"/>
    
    <xsl:if test="$hierarchy-level-members">
        <xsl:variable name="horizontal-header-colspan">
            <xsl:call-template name="count-all-levels">
                <xsl:with-param name="axis-name" select="$vertical-axis"/>
            </xsl:call-template>
        </xsl:variable>
        <tr>
            <!--
                Hierarchy heading for column axis rows
            -->
            <xsl:choose>
                <xsl:when test="count($hierarchy-members[number(md:LNum/text()) &lt; $hierarchy-level])= 0">
                    <th class="hierarchy">
                        <xsl:attribute name="colspan">
                            <xsl:value-of select="$horizontal-header-colspan"/>
                        </xsl:attribute>
                        <xsl:value-of select="$hierarchy-name"/>
                    </th>
                </xsl:when>
                <xsl:otherwise>
                <!--
                    TODO: remove emty cells, use rowspan instead
                
                -->
                    <th class="spacer">
                        <xsl:attribute name="colspan">
                            <xsl:value-of select="$horizontal-header-colspan"/>
                        </xsl:attribute>
                        <br/>
                    </th>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:for-each select="$axis-tuples">
                <xsl:variable name="axis-tuple-position" select="position()"/>
                <xsl:variable name="axis-tuple" select="."/>
                <xsl:variable name="hierarchy-member" select="md:Member[@Hierarchy=$hierarchy-name]"/>
                <xsl:variable name="hierarchy-member-level" select="number($hierarchy-member/md:LNum/text())"/>
                <xsl:variable name="hierarchy-level-member" select="hierarchy-member[number(md:LNum/text()) = $hierarchy-level]"/>
                <xsl:variable name="member-path">
                    <xsl:call-template name="member-path">
                        <xsl:with-param name="axis-tuple" select="$axis-tuple"/>
                        <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="member-path-length" select="string-length($member-path)"/>
                <xsl:variable name="prev-tuple" select="$axis-tuples[$axis-tuple-position - 1]"/>
                <xsl:choose>
                    <!--
                        Member heading for column axis rows
                    -->
                    <xsl:when test="$hierarchy-member-level = $hierarchy-level">
                        <xsl:variable name="prev-member-path">
                            <xsl:call-template name="member-path">
                                <xsl:with-param name="axis-tuple" select="$prev-tuple"/>
                                <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                            </xsl:call-template>
                        </xsl:variable>
                        <xsl:if test="$prev-member-path != $member-path">
                            <xsl:variable name="siblings">
                                <xsl:for-each select="$axis-tuples[position()&gt;$axis-tuple-position]">
                                    <xsl:variable name="subsequent-member-path">
                                        <xsl:call-template name="member-path">
                                            <xsl:with-param name="axis-tuple" select="."/>
                                            <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                                        </xsl:call-template>
                                    </xsl:variable>
                                    <xsl:choose>
                                        <xsl:when test="substring($subsequent-member-path, 1, $member-path-length) = $member-path">Y</xsl:when>
                                        <xsl:otherwise>N</xsl:otherwise>
                                    </xsl:choose>
                                </xsl:for-each>
                            </xsl:variable>
                            <xsl:variable name="count-siblings">
                                <xsl:choose>
                                    <xsl:when test="contains($siblings, 'N')"><xsl:value-of select="string-length(substring-before($siblings, 'N'))"/></xsl:when>
                                    <xsl:otherwise><xsl:value-of select="string-length($siblings)"/></xsl:otherwise>
                                </xsl:choose>
                            </xsl:variable>
                            <xsl:variable name="descendants">
                                <xsl:for-each select="$axis-tuples[position()&gt;$axis-tuple-position]">
                                    <xsl:variable name="subsequent-member-path">
                                        <xsl:call-template name="member-path">
                                            <xsl:with-param name="axis-tuple" select="."/>
                                            <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                                        </xsl:call-template>
                                    </xsl:variable>
                                    <xsl:choose>
                                        <xsl:when 
                                            test="
                                                $subsequent-member-path != $member-path
                                            and substring($subsequent-member-path, 1, $member-path-length) = $member-path
                                            "
                                        >Y</xsl:when>
                                        <xsl:otherwise>N</xsl:otherwise>
                                    </xsl:choose>
                                </xsl:for-each>
                            </xsl:variable>
                            <xsl:variable name="count-descendants">
                                <xsl:choose>
                                    <xsl:when test="contains($descendants, 'N')"><xsl:value-of select="string-length(substring-before($descendants, 'N'))"/></xsl:when>
                                    <xsl:otherwise><xsl:value-of select="string-length($descendants)"/></xsl:otherwise>
                                </xsl:choose>
                            </xsl:variable>
                            <th>
                                <xsl:attribute name="title"><xsl:value-of select="$siblings"/></xsl:attribute>
                                <xsl:attribute name="colspan"><xsl:value-of select="$count-siblings + 1"/></xsl:attribute>
                                <xsl:call-template name="driller">
                                    <xsl:with-param name="member" select="$hierarchy-number"/>
                                    <xsl:with-param name="tuple" select="$axis-tuple"/>
                                    <xsl:with-param name="expanded" select="$count-descendants != 0"/>
                                </xsl:call-template>
                                <xsl:value-of select="$hierarchy-member/md:Caption/text()"/>
                            </th>
                        </xsl:if>
                    </xsl:when>
                    <!--
                        Cell right beneath the Member heading
                    -->
                    <xsl:when test="$hierarchy-member-level + 1 = $hierarchy-level">
                        <xsl:variable name="num-levels-after">
                            <xsl:call-template name="num-levels-after">
                                <xsl:with-param name="members-beyond-level" select="$members-beyond-level"/>
                                <xsl:with-param name="hierarchy-level" select="$hierarchy-level"/>
                            </xsl:call-template>
                        </xsl:variable>
                        <th class="spacer">
                            <xsl:attribute name="rowspan"><xsl:value-of select="$num-levels-after + 1"/></xsl:attribute>
                            <br/>
                        </th>
                    </xsl:when>
                    <xsl:otherwise>
                        <!-- Do nothing here. -->
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:for-each>
        </tr>
    </xsl:if>
    <xsl:if test="$members-beyond-level">
        <xsl:call-template name="horizontal-hierarchy-levels">
            <xsl:with-param name="axis-tuples" select="$axis-tuples"/>
            <xsl:with-param name="hierarchy-members" select="$hierarchy-members"/>
            <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
            <xsl:with-param name="hierarchy-name" select="$hierarchy-name"/>
            <xsl:with-param name="hierarchy-level" select="$hierarchy-level + 1"/>
        </xsl:call-template>
    </xsl:if>
</xsl:template>

<xsl:template name="vertical">
    <xsl:variable name="axis-hierarchies-info" select="$axes-info[@name=$vertical-axis]/md:HierarchyInfo"/>
    <xsl:variable name="axis-tuples" select="$axes[@name=$vertical-axis]/md:Tuples/md:Tuple"/>    
    <xsl:variable name="axis-members" select="$axis-tuples/md:Member"/>
    
    <tr>
        <!--
            This is the header row for the vertical axis
        -->
        <xsl:for-each select="$axis-hierarchies-info">        
            <xsl:variable name="hierarchy-name" select="@name"/>
            <xsl:variable name="hierarchy-members" select="$axis-members[@Hierarchy=$hierarchy-name]"/>
            <xsl:variable name="num-levels">
                <xsl:call-template name="num-levels-after">
                    <xsl:with-param name="members-beyond-level" select="$hierarchy-members"/>
                    <xsl:with-param name="hierarchy-level" select="-1"/>
                </xsl:call-template>
            </xsl:variable>
            <th class="hierarchy">
                <xsl:attribute name="colspan"><xsl:value-of select="$num-levels"/></xsl:attribute>
                <xsl:value-of select="@name"/>
            </th>
        </xsl:for-each>
        <!--
            These are emtpy cells on the vertical axis' header row
            that appear beneath the column axis' headers.
        -->
        <xsl:choose>
            <xsl:when test="$axis-tuples">
                <xsl:for-each select="$axes[@name=$horizontal-axis]/md:Tuples/md:Tuple">        
                    <th class="spacer">
                        <br/>
                    </th>
                </xsl:for-each>
            </xsl:when>
            <xsl:otherwise>
                <th class="spacer">
                    <br/>
                </th>
                <xsl:call-template name="celldata"/>
            </xsl:otherwise>
        </xsl:choose>
    </tr>
    <!--
        These are the actual rows for the vertical axis.
    -->
    <xsl:for-each select="$axis-tuples">
        <xsl:variable name="axis-tuple" select="."/>
        <xsl:variable name="axis-tuple-position" select="position()"/>
        <xsl:variable name="prev-tuple" select="$axis-tuples[$axis-tuple-position - 1]"/>
        <tr>            
            <xsl:for-each select="md:Member">
                <xsl:variable name="hierarchy-number" select="position()"/>
                <xsl:variable name="hierarchy-name" select="@Hierarchy"/>
                <xsl:variable name="hierarchy-level" select="number(md:LNum/text())"/>
                <xsl:variable name="hierarchy-members" select="$axis-members[@Hierarchy=$hierarchy-name]"/>
                <xsl:variable name="members-beyond-level" select="$hierarchy-members[number(md:LNum/text()) &gt; $hierarchy-level]"/>
                <xsl:variable name="num-levels">
                    <xsl:call-template name="num-levels-after">
                        <xsl:with-param name="members-beyond-level" select="$hierarchy-members"/>
                        <xsl:with-param name="hierarchy-level" select="-1"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="num-levels-after">
                    <xsl:call-template name="num-levels-after">
                        <xsl:with-param name="members-beyond-level" select="$members-beyond-level"/>
                        <xsl:with-param name="hierarchy-level" select="$hierarchy-level"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="num-remaining-levels" select="$num-levels - $num-levels-after"/>
                <xsl:variable name="member-path">
                    <xsl:call-template name="member-path">
                        <xsl:with-param name="axis-tuple" select="$axis-tuple"/>
                        <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="member-path-length" select="string-length($member-path)"/>
                <xsl:variable name="prev-member-path">
                    <xsl:call-template name="member-path">
                        <xsl:with-param name="axis-tuple" select="$prev-tuple"/>
                        <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                    </xsl:call-template>
                </xsl:variable>
                <xsl:variable name="prev-member-path-length" select="string-length($prev-member-path)"/>
                <xsl:variable name="prev-level-number" select="number($prev-tuple/md:Member[$hierarchy-number]/md:LNum)"/>
                <xsl:if test="$num-remaining-levels &gt; 1">                    
                    <xsl:if test="$hierarchy-level != $prev-level-number">
                        <xsl:variable name="descendants">
                            <xsl:for-each select="$axis-tuples[position()&gt;$axis-tuple-position]">
                                <xsl:variable name="subsequent-member-path">
                                    <xsl:call-template name="member-path">
                                        <xsl:with-param name="axis-tuple" select="."/>
                                        <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                                    </xsl:call-template>
                                </xsl:variable>
                                <xsl:choose>
                                    <xsl:when 
                                        test="
                                            $subsequent-member-path != $prev-member-path
                                        and substring($subsequent-member-path, 1, $prev-member-path-length) = $prev-member-path
                                        "
                                    >Y</xsl:when>
                                    <xsl:otherwise>N</xsl:otherwise>
                                </xsl:choose>
                            </xsl:for-each>
                        </xsl:variable>
                        <xsl:variable name="count-descendants">
                            <xsl:choose>
                                <xsl:when test="contains($descendants, 'N')"><xsl:value-of select="string-length(substring-before($descendants,'N'))"/></xsl:when>
                                <xsl:otherwise><xsl:value-of select="string-length($descendants)"/></xsl:otherwise>
                            </xsl:choose>
                        </xsl:variable>
                        <xsl:if test="$count-descendants &gt; 0 or $prev-level-number &lt; $hierarchy-level">
                        <!--
                            This is the spacer right below the ro
                        -->
                            <th class="spacer">
                                <xsl:attribute name="rowspan">
                                    <xsl:value-of select="$count-descendants + 1"/>
                                </xsl:attribute>
                                <br/>
                            </th>
                        </xsl:if>
                    </xsl:if>
                </xsl:if>
                <xsl:choose>
                    <xsl:when test="$member-path!=$prev-member-path">                        
                        <xsl:variable name="siblings">
                            <xsl:for-each select="$axis-tuples[position()&gt;=$axis-tuple-position and position()]">
                                <xsl:variable name="subsequent-member-path">
                                    <xsl:call-template name="member-path">
                                        <xsl:with-param name="axis-tuple" select="."/>
                                        <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                                    </xsl:call-template>
                                </xsl:variable>
                                <xsl:choose>
                                    <xsl:when test="$subsequent-member-path = $member-path">Y</xsl:when>
                                    <xsl:otherwise>N</xsl:otherwise>
                                </xsl:choose>
                            </xsl:for-each>
                        </xsl:variable>
                        <xsl:variable name="count-siblings">
                            <xsl:choose>
                                <xsl:when test="contains($siblings, 'N')"><xsl:value-of select="string-length(substring-before($siblings,'N'))"/></xsl:when>
                                <xsl:otherwise><xsl:value-of select="string-length($siblings)"/></xsl:otherwise>
                            </xsl:choose>
                        </xsl:variable>
                        <xsl:variable name="descendants">
                            <xsl:for-each select="$axis-tuples[position()&gt;=$axis-tuple-position]">
                                <xsl:variable name="subsequent-member-path">
                                    <xsl:call-template name="member-path">
                                        <xsl:with-param name="axis-tuple" select="."/>
                                        <xsl:with-param name="hierarchy-number" select="$hierarchy-number"/>
                                    </xsl:call-template>
                                </xsl:variable>
                                <xsl:if 
                                    test="
                                        substring($subsequent-member-path , 1, $member-path-length) = $member-path
                                    and string-length($subsequent-member-path) &gt; $member-path-length
                                    "
                                >Y</xsl:if>
                            </xsl:for-each>
                        </xsl:variable>                        
                        <th>
                            <xsl:attribute name="title"><xsl:value-of select="$member-path"/></xsl:attribute>
                            <xsl:attribute name="colspan"><xsl:value-of select="$num-levels-after + 1"/></xsl:attribute>
                            <xsl:if test="$count-siblings &gt; 1">
                                <xsl:attribute name="rowspan"><xsl:value-of select="$count-siblings"/></xsl:attribute>
                            </xsl:if>
                            <xsl:call-template name="driller">
                                <xsl:with-param name="member" select="$hierarchy-number"/>
                                <xsl:with-param name="tuple" select="$axis-tuple"/>
                                <xsl:with-param name="expanded" select="string-length($descendants) &gt; 0"/>
                            </xsl:call-template>
                            <xsl:value-of select="md:Caption/text()"/>
                        </th>
                    </xsl:when>  
                    <xsl:otherwise>
                    <!--
                        Do nothing
                        <td><br/></td>
                    -->
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:for-each>
            <xsl:call-template name="celldata">
                <xsl:with-param name="row" select="$axis-tuple-position - 1"/>
            </xsl:call-template>
        </tr>
    </xsl:for-each>
</xsl:template>

<xsl:variable name="cols" select="$axes[@name=$horizontal-axis]/md:Tuples/md:Tuple"/>
<xsl:variable name="colcount" select="count($cols)"/>
<xsl:variable name="cells" select="//md:CellData/md:Cell"/>
<xsl:template name="celldata">
    <xsl:param name="row" select="0"/>
    <xsl:for-each select="$cols">
        <xsl:variable name="col" select="position()"/>
        <xsl:variable name="cell" select="$cells[@CellOrdinal = ($row * $colcount + ($col - 1))]"/>
        <td>
            <xsl:choose>
                <xsl:when test="$cell/md:FmtValue">
					<xsl:value-of select="$cell/md:FmtValue/text()"/>
                </xsl:when>
                <xsl:when test="$cell/md:Value">
					<xsl:value-of select="$cell/md:Value/text()"/>
                </xsl:when>
                <xsl:otherwise>
                    <br/>
                </xsl:otherwise>
            </xsl:choose>
            
        </td>
    </xsl:for-each>
</xsl:template>

</xsl:stylesheet>
