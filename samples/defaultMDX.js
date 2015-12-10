var mdx = [
"SELECT",
"      [Measures].Members",
"ON COLUMNS,",
"      [Product].[Product Family].Members",
"ON ROWS",
"FROM  [Sales]",
"WHERE [Time].[1997].[Q2]"
].join("\n");