function (context,args){
    const analytics = $fs.shuna.analytics
    analytics()
    if(!args) return `
\`Ythis is an \`\`Nsql\`\`Y parser, based on psql\`
You cann give it an sql \`Nquery\` and it will execute it
needs a \`Ndb\` to work on passed
    
\`XThis script does not conform with the ACID criterea\`
        
to see what db script should look like pass dbexample:true
to see what this script supports pass showsupported:true
to see syntax for a command use syntax:<command>
`
    if(args.dbexample)
        return `db script like:
        
<validation>
let f = (q, p) => {
    q = JSON.parse(JSON.stringify(q || {}))
    p = p && JSON.parse(JSON.stringify(p))
    return $db.f(q, p)
}
let i = (o) => {
    o = JSON.parse(JSON.stringify(q || {}))
    return $db.i(o)
}
let r = (q) => {
    q = JSON.parse(JSON.stringify(q || {}))
    return $db.r(q)
}
let u = (q, c) => {
    q = JSON.parse(JSON.stringify(q || {}))
    if(!c) return {ok:!1}
    c = c && JSON.parse(JSON.stringify(c))
    return $db.u(q, c)
}
    
return {f,i,r,u}}`
    if(args.showsupported) return`
\`2SUPPORTED\` (\`XPLANNED\` = not yet supported)
    \`2CREATE TABLE\`
        \`XPRIMARY KEY\`
        \`XFOREIGN KEY\`
        \`XUNIQUE\`
        \`2NOT NULL\`
        \`2DEFAULT\`
        \`XCHECK\`
        \`XAUTO_INCREMENT\` (SERIAL DATA TYPE)
        \`XTIMESTAMP\`
    \`2DROP TABLE\`
    \`2INSERT INTO\`
    \`2SELECT FROM\`
        \`2DISTINCT\`
        \`2AS\`
        \`2LIMIT\`
        \`2OFFSET\`
        \`XJOIN\`
        \`XINNER JOIN\`
        \`XLEFT JOIN\`
        \`XRIGHT JOIN\`
        \`XFULL/OUTER JOIN\`
    \`XORDER BY\` \`XASC\`|\`XDESC\`
    \`XGROUP BY\`
    \`XUPDATE SET\`
    \`XDELETE FROM\`
    \`XWHERE\`
        \`XAND\`
        \`XOR\` 
        \`XIS NULL\`
        \`XIN\`
        \`XBETWEEN\`
        \`XEXISTS\`
        \`XANY\`
        \`XALL\`
    \`XLIKE\` 
    \`XFUNCTIONS\`: 
        \`XMIN\`, \`XMAX\`, \`XSUM\`, \`XCOUNT\`, \`XAVG\`
        \`XCOALESCE\`
    \`XSHOW TABLES\`
    \`XSHOW TABLE\`
    \`XALTER TABLE\`
        \`XRENAME COLUMN\`
        \`XRENAME TABLE\`
        \`XADD COLUMN\`
        \`XDROP COLUMN\`
        \`XALTER COLUMN\`
            \`XSET DEFAULT\`
            \`XDROP DEFAULT\`
            \`XTYPE\`
        \`XADD CONSTRAINT\`
        \`XDROP CONSTRAINT\`
        \`XALTER CONSTRAINT\`
\`F    HIGH PERFORMANCE IMPACT\`:
        this script in general has a very negative performance impace since many things run in js rather than on the db
        these functions have an especially high impact
        DISTINCT
\`J    DIFFERENT FROM SQL\`:
    \`5SQL STATEMENTS FOR THIS SCRIPT ARE CASE-SENSITIVE AND HAVE TO BE UPPERCASE TO WORK\`
    you cannot splt commans with ; only one command is run per script call
    all data types have no args in table creation
    \`STEXT\` : \`SNO\` CHAR LIMIT (js string limit)
    \`SINTEGER\` : \`SNO\` LIMIT (up to js Infinity)
    WHERE supports aggregate functions
    wildcard(*) renaming is allowed in SELECT statements, the scrip will put the rows into an object under the identifier provided
    executing SELECT commands returns an object array when run in a script or with rawdata:true, but a stylized table in commandline
\`D    NOT SUPPORTED / UNPLANNED\`:
    stored procedures
    triggers
    comments
    views
    HAVING
    UNION               
    any data type besides TEXT, INTEGER, DECIMAL, TIMESTAMP, NULL
`
    const syntax = {
        "SYNTAX":"[] means optional, ... means more of the previous, {} is a signal that values are grouped, | is an OR sign, use \" quotation marks for values with spaces, commas, () or other symbols that could be missinterpreted as sql syntax (like keywords), table names don't support spaces",
        "CREATE TABLE":"CREATE TALBE <table_name> ({<column_name> <DATATYPE> [ DEFAULT <expression> ] [ column_constraint [ ... ] ]}[ ,... ])",
        "DROP TABLE":"DROP TABLE <table_name>",
        "INSERT INTO":"INSERT INTO <table_name> [(<column_name> [,...] )] VALUES ({ <expression> | DEFAULT } [,...]) [,...]",
        "SELECT":"SELECT [ DISTINCT ] { * | <expression> [AS <output_name>] } [,...] FROM <table_name> [ JOIN ] [ WHERE <condition> ] [ GROUP BY <column> [,...]] [ LIMIT <count>] [ OFFSET <count> ]",
        "UPDATE SET":"UPDATE <table_name> SET <column> = <expression> [,...] [ WHERE <condition> ]",
        "DELETE FROM":"DELETE FROM <table_name> [ WHERE <condition> ]",                                                         
        "ALTER TABLE":"ALTER TABLE <table_name> <action>",
        "JOIN":"entry missing"
    }
    if(args.syntax){
        let res =  syntax[args.syntax.toUpperCase()]
        if(!res) return "`Nsyntax` options: `Vsyntax`, `VCREATE TABLE`, `VDROP TABLE`, `VINSERT INTO`, `VSELECT`, `VJOIN`, `VUPDATE SET`, `VDELETE FROM`, `VALTER TABLE`\nnotice: syntax will be present even if a feature is not implemented yet, see showsupported:true"
        return res
    }
    // So I don't need to add the db param while testing
    let wl = $db.f({s:"WHITELIST",u:context.caller}).first()
    const db = args.db ? args.db.call() : wl ? $fs.shira.db() : undefined,uilib = $fs.shira.uilib()
    if(!db) return {ok:!1,msg:"no `Ndb`"}
    
    let db_name
    
    // for some analytics
    if(args.db){
        if(typeof args.db.name !== "string") throw new Error("cannot read \"split\" of undefined reading args.db.name")
            db_name = args.db.name.split(".")[0]
    } else {
        db_name = "shira"   
    }
    analytics({ref:"db_" + db_name})
    
    /*const meta = db.f({_id:"sql_db_" + db_name + "_metadata"}).first()
    if(!meta){
    db.i({_id:"sql_db_" + db_name + "_metadata",tables:[]})
    return {ok:!0,msg:"created sql metadata object in db, you can now run commands"}
    }*/
    const splitByQuotationOrSymobl = (str, sym) => {
        // split by sym but if it is in in quotation marks, ignore it
        let res = [];
        let tmp = "";
        let in_quotes = false;
        let in_entity = false;
        for (let i=0; i<str.length; i++) {
            if (str[i] === '\\' && in_entity  === false) { 
                in_entity = true;
                if (in_quotes === true) {
                    tmp += str[i];
                }
            } else if (in_entity === true) { // add a match
                in_entity = false;
                if (in_quotes === true) {
                    tmp += str[i];
                }
            } else if (str[i] === '"') { // start a new match
                in_quotes = !in_quotes;
                tmp += str[i];
            } else if (str.substring(i,Math.min(i+sym.length,str.length -1)) === sym && in_quotes === false){ // split at sym
                i += sym.length-1
                if(tmp)
                    res.push(tmp)
                tmp = "";
            }
            else { // append a char to the match
                tmp += str[i];
            } 
        }
        res.push(tmp)
        return  res 
    },
    splitOutsidePartenthesies = (str, sym) => {
        let res = [];
        let tmp = "";
        let in_quotes = false;
        let in_parenthesies = false;
        let in_entity = false;
        for (let i=0; i<str.length; i++) {
            if (str[i] === '\\' && in_entity  === false) { 
                in_entity = true;
                if (in_parenthesies === true) {
                    tmp += str[i];
                }
            } else if (in_entity === true) { // add a match
                in_entity = false;
                if (in_parenthesies === true || in_quotes === true) {
                    tmp += str[i];
                }
            } else if (str[i] === '"') { // start a new match
                in_quotes = !in_quotes;
                tmp += str[i];
            } else if (str[i] === "(" && !in_quotes) {
                in_parenthesies = true;
                tmp += str[i];
            } else if (str[i] === ")" && !in_quotes) {
                in_parenthesies = false
                tmp += str[i]
            } else if (str.substring(i,Math.min(i+sym.length,str.length -1)) === sym && in_parenthesies === false && in_quotes === false){ // split at sym
                i += sym.length-1
                if(tmp)
                    res.push(tmp)
                tmp = "";
            }
            else { // append a char to the match
                tmp += str[i];
            } 
        }
        res.push(tmp)
        return  res 
    },
    parseType = (str, type) => {
        if(!str) return null
        if(type == "TEXT") {
            var trim = true
            if(str.startsWith("\"") && str.endsWith("\"")) 
                {
                str = str.substring(1,str.length-1)
                trim = false
            }
            // de-escape characters
            str = str.replace("\\\"","\"")
            str = str.replace("\\\\","\\")
            return trim ? str.trim() : str
        }
        if(type == "INTEGER"){
            let num = Number(str)
            if(isNaN(num) || num % 1 !== 0) return error(TypeError,str + " was not INTEGER")
                return num
        }
        if(type == "DECIMAL"){
            let num = Number(str)
            if(isNaN(num)) return error(TypeError,str + " was not DECIMAL")
                return num
        }
    },
    removeUnnededSpaces = (str) => {
        let tmp = [];
        let in_quotes = false;
        let in_parenthesies = false;
        let in_entity = false;
        let after_space = false;
        let after_comma = false;
        let after_opening_parenthesy = false
        let whitespace = [' ', '\t', '\n', '\v', '\r'];
        for (let i = 0; i < str.length; i++) {
            let char = str[i];
            if (char === '\\' && in_entity === false) {
                in_entity = true;
                if (in_parenthesies === true) {
                    tmp.push(char);
                }
            } else if (in_entity === true) {
                // add a match
                in_entity = false;
                after_comma = false;
                after_space = false;
                after_opening_parenthesy = false
                tmp.push(char);
            } else if (char === '"') {
                // start a new match
                in_quotes = !in_quotes;
                after_space = false;
                after_comma = false;
                after_opening_parenthesy = false
                tmp.push(char);
            } else if (char === ',' && !in_quotes) {
                after_comma = true;
                after_space = false;
                after_opening_parenthesy = false
                tmp.push(char)
            } else if (char === '(' && !in_quotes) {
                after_comma = false;
                after_space = false;
                in_parenthesies = true;
                after_opening_parenthesy = true
                tmp.push(char);
            } else if (char === ')' && !in_quotes) {
                after_comma = false;
                after_space = false;
                after_opening_parenthesy = false
                in_parenthesies = false;
                tmp.push(char);
            } else if (whitespace.includes(char) && !in_quotes) {
                if (after_comma || after_space || after_opening_parenthesy) continue;
                after_space = true;
                tmp.push(' ');
            } else {
                // append a char to the match
                after_comma = false;
                after_space = false;
                after_opening_parenthesy = false
                tmp.push(char);
            }
        }
        return tmp.join('').trim();
    },
    error = (err,msg) => {
        if(!args.softerror && ! args.noerror){
            throw new err(msg)
        } else {
            return {ok:!1,msg}
        }
    }
    let sql = args.sql || args.query
    if(!sql) return {ok:!1,msg:"no query provided"}
    sql = removeUnnededSpaces(sql)
    if(sql.startsWith("CREATE TABLE"))
        {
        let table = {}
        sql = sql.substring(13) // remove the "CREATE TABLE "
        table.name = sql.substring(0,sql.indexOf(" "))
        table._id = "table_definition_" + table.name
        table.type = "sql_table"
        
        if(db.f({_id:table._id}).first()) return error(ReferenceError,"Table " + table.name + " already exists.")
            
        if(sql.indexOf("(") == -1 || sql.indexOf(")") == -1) return error(SyntaxError,"missing parenthesies")
            
        let columns = splitByQuotationOrSymobl(sql.split("(")[1].split(")")[0],",")
        table.columns = {}
        
        for(let i = 0;i < columns.length;i++){
            let col_com = splitByQuotationOrSymobl(columns[i].trim()," "),
            column = {}
            if(col_com.length < 2) return error(SyntaxError,"missing arguments at " + col_com.join(" "))
                
            let column_name = parseType(col_com[0],"TEXT")
            
            if(table.columns[column_name]) return error(SyntaxError,"column names have to be unique")
                
            column.type = col_com[1].toUpperCase()
            
            if(!["INTEGER","DECIMAL","TEXT"].includes(column.type)) return error(TypeError,"unsupported data type: " + column.type)
                for(;col_com.length > 3;) {
                // CONSTRAINTS
                switch (col_com[2].toUpperCase()){
                    case "DEFAULT" :
                    column.default = parseType(col_com[3],column.type)
                    col_com.splice(2,2)
                    break
                    case "NOT":
                    if(col_com[3].toUpperCase() !== "NULL") return error(EvalError,"NOT " + col_com[3].toUpperCase() + " is not a valid constraint")
                        column.not_null = true
                    col_com.splice(2,2)
                    break
                    case "PRIMARY":
                    case "FOREIGN":
                    case "UNIQUE":
                    case "CHECK":
                    case "AUTO_INCREMENT":
                    return error(Error,col_com[2].trim().toUpperCase() + " is not yet implemented")
                    default:
                    return error(ReferenceError,col_com[2].trim().toUpperCase() + " is not recognized")
                }
            }
            table.columns[column_name] = column
        }
        delete(table.name)
        db.i(table)
        return {ok:!0}
    }
    if(sql.startsWith("DROP TABLE")) {
        sql = sql.substring(10).trim()
        let name = splitByQuotationOrSymobl(sql," ")[0]
        let _id = "table_definition_" + name
        if(name.includes(" ")) return error(SyntaxError,"table names cannot include spaces")
            db.r({_id})
        db.r({table:name,type:"sql_row"})
        return {ok:!0}
    }
    if(sql.startsWith("INSERT INTO")){
        sql = sql.substring(11).trim()
        let table_name = splitByQuotationOrSymobl(sql," ")[0].trim()
        sql = sql.substring(table_name.length)
        let table = db.f({_id:"table_definition_" + table_name}).first()
        let pieces = splitByQuotationOrSymobl(sql,"VALUES")
        let useCols = pieces[0].trim()
        let allCols = Object.entries(table.columns).map(([key,val]) => key)
        if(useCols){
            useCols = splitByQuotationOrSymobl(useCols.split("(")[1].split(")")[0],",")
            useCols = useCols.map(el => el.trim())
            for(let [key,val] of Object.entries(table.columns)){
                if(!useCols.includes(key) && val.not_null && !val.default) return error(Error,"this command violates the NOT NULL constraint of column " + key)
                }
            useCols.forEach(el => {
                if(!allCols.includes(el)) return error(Error,"Column " + el + " does not exist on table " + table_name)
                });
        }
        else useCols = Object.entries(table.columns).map(([key,val]) => key)
        let cols = table.columns
        
        let rows = splitOutsidePartenthesies(pieces.splice(1,pieces.length-1).join("VALUES").trim(),",")
        for(let i = 0;i < rows.length;i++){
            let entry = {table:table_name,type:"sql_row",values:{}}
            let row = rows[i]
            let values = splitByQuotationOrSymobl(row.split("(")[1].split(")")[0],",")
            values = values.map(el => el.trim())
            let values_obj = {}
            if(values.length !== useCols.length) return error(SyntaxError,"INSERT INTO expected " + useCols.length +" values for row, but found " + values.length + " values near " + "("  + values.join(", ") + ")") 
                for(let j = 0;j<useCols.length;j++) {
                if(values[j].toUpperCase() === "DEFAULT")
                    {
                    if(!cols[useCols[j]].hasOwnProperty("default")) return error(Error,"column " + useCols[j] + " does not have DEFAULT value")
                        values_obj[useCols[j]] = cols[useCols[j]].default
                } else {
                    values_obj[useCols[j]] = values[j]
                }
            }
            for(let j = 0; j < allCols.length;j++) {
                if(cols[allCols[j]].not_null) {
                    if(!useCols.includes(allCols[j])) {
                        values_obj[allCols[j]] = cols[allCols[j]].default
                    }
                }
            }
            entry.values = values_obj
            db.i(entry) // AT A LATER TIME USE PK FOR _id AND IF NO PK THEN USE AN INTERNAL SERIAL AND TABLE NAME
        }
        return {ok:!0}
    }
    if(sql.startsWith("SELECT")){
        
        // SELECT [ DISTINCT ] { * | <expression> [AS <output_name>] } [,...] FROM <table_name> [ JOIN ] [ WHERE <condition> ] [ GROUP BY <column> [,...]] [ LIMIT <count>] [ OFFSET <count> ]
        // SELECT
        sql = sql.substring(7)
        // DISTINCT
        let distinct = sql.startsWith("DISTINCT")
        if(distinct) sql = sql.substring(9)
            // PROJECTION
        let pieces = splitByQuotationOrSymobl(sql," FROM ")
        if(pieces.length < 2) 
            return error(SyntaxError,"no FROM keyword detected")
        if(pieces.length > 2) 
            return error(SyntaxError,"duplicate FROM keybord, if you want it as value use quotations")
        
        let projection_input = splitByQuotationOrSymobl(pieces[0],",").map(el => el.trim())
        // FROM <table_name>
        let table_name = splitByQuotationOrSymobl(pieces[1].trim()," ")[0].trim()
        let query = {type:"sql_row",table:table_name}
        let limit
        let offset
        let table = db.f({_id:"table_definition_" + table_name}).first()
        
        sql = pieces[1].substring(table_name.length + 1)
        
        // JOIN(s)
        if(sql.includes("JOIN")) 
            return error(Error,"JOIN is not yet implemented")
        
        // WHERE
        if(sql.includes("WHERE")){
            let where_com = sql
            if(sql.includes("GROUP BY")) 
                where_com = splitByQuotationOrSymobl(where_com,"GROUP BY")[0].trim()
            if(sql.includes("LIMIT")) 
                where_com = splitByQuotationOrSymobl(where_com,"LIMIT")[0].trim()
            if(sql.includes("OFFSET")) 
                where_com = splitByQuotationOrSymobl(where_com,"OFFSET")[0].trim()
            if(!where_com.startsWith("WHERE")) return error(Error,"HOW?")
                sql = sql.substr(where_com.length+1)
            return error(Error,"WHERE is not yet implemented at " + where_com)
        }
        // GOUP BY
        if(sql.includes("GROUP BY")){
            let goup_com
            if(sql.includes("LIMIT")) 
                goup_com = splitByQuotationOrSymobl(goup_com,"LIMIT")[0].trim()
            if(sql.includes("OFFSET")) 
                goup_com = splitByQuotationOrSymobl(goup_com,"OFFSET")[0].trim()
            if(!goup_com.startsWith("GROUP BY")) return error(Error,"HOW2?")
                sql = sql.substr(goup_com.length+1)
            return error(Error,"GROUP BY is not yet implemented" + goup_com)
        }
        // LIMIT
        if(sql.includes("LIMIT")){
            let limit_com = sql
            if(sql.includes("OFFSET")) 
                limit_com = splitByQuotationOrSymobl(limit_com,"OFFSET")[0].trim()
            if(!limit_com.startsWith("LIMIT")) 
                return error(Error,"HOW3?")
            sql = sql.substr(limit_com.length+1)
            limit = parseType(limit_com.substring(5).trim(),"INTEGER")
        }
        // OFFSET
        if(sql.includes("OFFSET")){
            if(limit === undefined) return error(Error,"Cannot use OFFSET without LIMIT")
                offset = parseType(sql.substring(6).trim(),"INTEGER")
        }
        let projection_in_db = {} ,projection_mapping = []
        
        // projection parsing
        let used_namings = []
        for(let i = 0;i < projection_input.length;i++){
            let projection_in_split = splitByQuotationOrSymobl(projection_input[i]," AS ")
            let _table_col = projection_in_split[0].trim()
            let _renamed_col = parseType(projection_in_split[1],"TEXT")
            let map = {}        
            
            if(!Object.keys(table.columns).includes(_table_col) && _table_col !== "*")
                return error(Error,"Coumn " + _table_col + " does not exist")
            
            if(used_namings.includes(_renamed_col) || (!_renamed_col && used_namings.includes(_table_col)))
                return error(Error,"Output names cannot be used multiple times, at " + (_renamed_col || _table_col))
            
            map[_table_col] = _renamed_col || true
            
            if(_renamed_col) used_namings.push(_renamed_col)
                else used_namings.push(_table_col) 
            
            projection_mapping.push(map)
        }
        
        let has_wildcard = false
        
        for(let i = 0;i<projection_mapping.length;i++){
            Object.entries(projection_mapping[i]).forEach(([key,val]) => {
                if(key === "*") {
                    has_wildcard = true
                    projection_in_db = {}
                }
                if(!has_wildcard) {
                    projection_in_db["values." + key] = true
                }
            })
        }
        // WHERE parsing
        
        // WHERE {a = b [AND | OR]} [...]
        
        // GET DATA
        let db_data = db.f(query,projection_in_db).array().map(el => el.values)
        // DISTINCT
        if(distinct){
            db_data = db_data.filter((el,ix,arr) => ix === arr.indexOf(arr.find((el1) => JSON.stringify(el1) == JSON.stringify(el)))) 
        }
        // SORT
        
        //LIMIT
        if(limit !== undefined){
            if(offset === undefined)
                offset = 0
            db_data = db_data.filter((el,ix) => ix < offset + limit && ix >= offset)
        }   
        let data = []
        
        
        // projection mapping
        for (let i = 0;i < db_data.length;i++) {
            data.push({})
            for(let j = 0;j<projection_mapping.length;j++){
                Object.entries(projection_mapping[j]).forEach(([key,val]) => {
                    if (key === "*"){
                        if(val !== true)
                            data[i][val] = db_data[i]
                        else Object.entries(db_data[i]).forEach(([key2,val2]) => {
                            data[i][key2] = val2
                        })
                    }
                    else if(val === true){
                        data[i][key] = db_data[i][key]
                    } 
                    else {
                        data[i][val] = db_data[i][key]
                    }   
                })
            }
        }
        
        if(context.calling_script || args.rawdata) return data
        else {
            data.map(el =>  Object.entries(el).forEach(([key,val]) => {if(typeof val === "object"){
                el[key] = JSON.stringify(val)
            }}))    
            return "\n" + uilib.table(data,Object.keys(data[0]),Object.keys(data[0]))
        }
    }
    if(sql.startsWith("UPDATE")){ return error(Error,"`Xnot yet implemented`")}
    if(sql.startsWith("DELETE FROM")){ return error(Error,"`Xnot yet implemented`")}
    if(sql.startsWith("ALTER TABLE")){ return error(Error,"`Xnot yet implemented`")}
    return "`Xcommand not recognized`"
}
