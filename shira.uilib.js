function (context, args) {
    const len_wo_colors = (str) => {
            let len = str.length
            len -= Math.floor(count(str, "`") / 2) * 3
            return len
        },rjust = (str, len, sym = " ") => {
            for (;len_wo_colors(str) < len;) {
                str = sym + str
            }
            return str
        },
        ljust = (str, len, sym = " ") => {
            for (;len_wo_colors(str) < len;) {
                str += sym
            }
            return str
        },
        center = (str, len, sym = " ") => {
            for (let i = 0;len_wo_colors(str) < len;i++) {
                if (i % 2 === 0) str = sym + str
                else str += sym
            }
            return str
        },      
        count = (str, sym) => {
            return str.split(sym).length - 1
        },
        side_by_side = (str1, str2) => {
            let s1 = str1.split("\n")
            let s2 = str2.split("\n")
            let res = []
            for (let i = 0; i < Math.max(s1.length, s2.length); i++) {
                res.push((s1[i] || "") + (s2[i] || ""))
            }   
            return res.join("\n")
        }, splitConditional = (str, split, enter = "\"", exit = "\"") => {
            let res = [];
            let tmp = "";
            let in_escape = false;
            let in_entity = false;
            for (let i = 0; i < str.length; i++) {
                if (str[i] === '\\' && in_entity === false) {
                    in_entity = true;
                    if (in_escape === true) {
                        tmp += str[i];
                    }
                } else if (in_entity === true) { // add a match
                    in_entity = false;
                    if (in_escape === true) {
                        tmp += str[i];
                    }
                } else if (str[i] === enter) {
                    in_escape = true;
                    tmp += str[i];
                } else if (str[i] === exit) {
                    in_escape = false
                    tmp += str[i]
                } else if (str.substring(i, Math.min(i + split.length, str.length - 1)) === split && in_escape === false) { // split at sym
                    i += split.length - 1
                    if (tmp)
                        res.push(tmp)
                    tmp = "";
                } else { // append a char to the match
                    tmp += str[i];
                }
            }
            res.push(tmp)
            return res
        },tableLineSplit = (lines,width) => { // let lines = row[col].split("\n")
            let lines_output = []
            for (let k = 0; k < lines.length; k++) {
                // for these splits
                if (len_wo_colors(lines[k]) > width) { // if the line is longer than it should be
                    let line_in_output = ""
                    let in_color_code = false
                    let after_color_code = false
                    let remaining_input = lines[k]
                    let ll = 0  
                    for (let l = 0; l < lines[k].length && remaining_input.length > 0; l++) {
                        let char = lines[k][l]
                        let next_sign = remaining_input.substring(1).search(/[ .,_+-]/g)
                        let netx_opportunity = next_sign === -1 ? remaining_input.length : next_sign + 2
                        if (char === "`" && count(remaining_input, "`") > 1) {
                            in_color_code = !in_color_code
                            after_color_code = true
                            line_in_output += char
                            remaining_input = remaining_input.substring(1)
                        } else if (after_color_code) {
                            after_color_code = false
                            line_in_output += char
                            remaining_input = remaining_input.substring(1)
                        } else if (in_color_code && /[ .,_+-]/.test(char) && ll + netx_opportunity > width) {
                            if (remaining_input[l + 1] === "`") {
                                line_in_output += char + "`"
                                remaining_input = remaining_input.substring(2)  
                                lines_output.push(line_in_output)
                                line_in_output = ""
                                ll = 0

                            } else {
                                line_in_output += char
                                line_in_output += "`"
                                remaining_input = remaining_input.substring(1)
                                lines_output.push(line_in_output)
                                line_in_output = "`" + line_in_output[line_in_output.substring(0,line_in_output.length-1).lastIndexOf("`")+1]
                                ll = 0
                            }
                        } else if (!in_color_code && /[ .,_+-]/.test(char) && ll + netx_opportunity > width) {
                            line_in_output += char
                            remaining_input = remaining_input.substring(1)
                            lines_output.push(line_in_output)
                            line_in_output = ""
                            ll = 0
                        } else if (len_wo_colors(remaining_input) + ll <= width) {
                            line_in_output += remaining_input   
                            lines_output.push(line_in_output)
                            remaining_input = ""
                            line_in_output = ""
                            ll = 0
                        } else if (in_color_code && ll >= width - 2) {
                            line_in_output += char
                            line_in_output += "`"
                            remaining_input = remaining_input.substring(1)
                            lines_output.push(line_in_output)   
                            line_in_output = "`" + line_in_output[line_in_output.substring(0,line_in_output.length-1).lastIndexOf("`")+1]
                            ll = 0
                        } else if (ll >= width - 2) {
                            line_in_output += char
                            remaining_input = remaining_input.substring(1)
                            lines_output.push(line_in_output)
                            line_in_output = ""
                            ll = 0
                        } else {
                            ll++
                            line_in_output += char
                            remaining_input = remaining_input.substring(1)
                        }
                    }
                } else { // if the line first into the table
                    lines_output.push(lines[k])
                }
            }
            return lines_output
        },
        table = (rows, columns = Object.keys(rows[0]).map(el => {return {key:el,header:null}}), seperator = " | ") => {
            let column_names
            let warn = ""
            // for backwards compatability
            if (typeof columns[0] === "string") {
                column_names = columns
                warn += "`Dusing strings as columns is deprecated, use objects with key property`\n"
            } else {
                column_names = columns.map(el => el.key)
            }
            
            // calculate width
            let fullWidth = context.cols - ((column_names.length - 1) * seperator.length)
            let widths = {}
            let extra = fullWidth % column_names.length
            // set for every col
            for (let i = 0; i < column_names.length; i++) {
                widths[column_names[i]] = {}
                widths[column_names[i]].max = rows.reduce((acc, el) => acc < len_wo_colors(el[column_names[i]]) ? len_wo_colors(el[column_names[i]]) : acc, 0)
                widths[column_names[i]].gets = Math.floor(fullWidth / column_names.length)
                let wants = widths[column_names[i]].max - widths[column_names[i]].gets
                widths[column_names[i]].gets = Math.min(widths[column_names[i]].gets, widths[column_names[i]].max)
                widths[column_names[i]].ratio = widths[column_names[i]].max / widths[column_names[i]].gets
                extra -= wants < 0 ? wants : 0
            }
                extra += (fullWidth / column_names.length) % 1 === 1 ? 1 : 0
            // reassign the spots that are extra if there is a row that wants it
            for (; extra > 0;) {
                let max = column_names.reduce((acc, el) => acc ? (widths[acc].ratio < widths[el].ratio ? el : acc) : el, "")
                if (widths[max].ratio === 1) break;
                widths[max].gets++
                extra--
                widths[max].ratio = widths[max].max / widths[max].gets
            }
            // for every row
            for (let i = 0; i < rows.length; i++) {
                let row = rows[i]
                // for every col
                for (let j = 0; j < column_names.length; j++) {
                    let col = column_names[j]
                    // split by \n
                    row[col] = tableLineSplit(row[col].split("\n"),widths[col].gets).join("\n")
                }

            }
            let row_strings = []
            for(let i = 0; i < rows.length; i++) {
                let row = rows[i]
                let max_newlines = column_names.reduce((acc,el,ix,arr) => acc > count(row[el], "\n") + 1 ? acc : count(row[el], "\n") + 1, 0)
                let tmp = ""
                for(let j = 0; j < column_names.length; j++) {
                    let col = column_names[j]
                    let lines = row[col].split("\n")
                    let seps = []
                    for(;lines.length !== max_newlines;){
                        lines.push(" ")
                    }
                    for(;seps.length !== max_newlines;){
                        seps.push(seperator)
                    }
                    lines = lines.map((el) => ljust(el,widths[col].gets))
                    if(j === 0) tmp = lines.join("\n")  
                    else tmp = side_by_side(side_by_side(tmp, seps.join("\n")), lines.join("\n"))
                    
                }
                row_strings.push(tmp)
                    
            }

            let header_string = ""
            if(columns.reduce((acc,el) => acc && el.header ? acc : false,true)){
                let headers = {}
                columns.forEach(el => headers[el.key] = el.header)
                
                for (let j = 0; j < column_names.length; j++) {
                    let col = column_names[j]
                    if(headers[col])
                        headers[col] = tableLineSplit(headers[col].split("\n"),widths[col].gets).join("\n")
                }
                
                let max_newlines = column_names.reduce((acc,el,ix,arr) => acc > count(headers[el], "\n") + 1 ? acc : count(headers[el], "\n") + 1, 0)
                for(let j = 0; j < column_names.length; j++) {
                    let col = column_names[j]
                    let lines = headers[col].split("\n")
                    let seps = []
                    for(;lines.length !== max_newlines;){
                        lines.push(" ")
                    }
                    for(;seps.length !== max_newlines;){
                        seps.push(seperator)
                    }
                    lines = lines.map((el) => center(el,widths[col].gets))
                    if(j === 0) header_string = lines.join("\n")
                    else header_string = side_by_side(side_by_side(header_string, seps.join("\n")), lines.join("\n"))
                }
                header_string += "\n\n"
            }
            
            if(warn) warn += "\nif you do not own this script, contact script owner\nbackwards compatability will not always be supported"
            return warn + header_string + row_strings.join("\n")
        },
        analyze_npc = (loc) => {/* -- ommited -- */},
        locTable = (locs,agressivePlayerLabeling=false,useTable=false,headers=false) => {/* -- ommited -- */}
  if(!context.calling_script) return "`Ythis is a ui library used by shira products`\nsee\nhttps://github.com/1shira/hackmud/blob/main/shira.uilib.js"
    return {rjust,ljust,center,side_by_side,len_wo_colors,count,table,analyze_npc,locTable}
}
