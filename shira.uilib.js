function (context, args) {
  const len_wo_colors = str => {
      let len = str.length
      len -= Math.floor(count(str, "`") / 2) * 3
      return len
    },
    rjust = (str, len, sym = " ") => {
      for (; len_wo_colors(str) < len; ) {
        str = sym + str
      }
      return str
    },
    ljust = (str, len, sym = " ") => {
      for (; len_wo_colors(str) < len; ) {
        str += sym
      }
      return str
    },
    center = (str, len, sym = " ") => {
      for (let i = 0; len_wo_colors(str) < len; i++) {
        if (i % 2 === 0) str = sym + str
        else str += sym
      }
      return str
    },
    count = (str, search) => {
      return str.split(search).length - 1
    },
    side_by_side = (str1, str2) => {
      let s1 = str1.split("\n")
      let s2 = str2.split("\n")
      let res = []
      for (let i = 0; i < Math.max(s1.length, s2.length); i++) {
        res.push((s1[i] || "") + (s2[i] || ""))
      }
      return res.join("\n")
    },
    splitConditional = (str, split, enter = '"', exit = '"') => {
      let res = []
      let tmp = ""
      let in_escape = false
      let in_entity = false
      for (let i = 0; i < str.length; i++) {
        if (str[i] === "\\" && in_entity === false) {
          in_entity = true
          if (in_escape === true) {
            tmp += str[i]
          }
        } else if (in_entity === true) {
          // add a match
          in_entity = false
          if (in_escape === true) {
            tmp += str[i]
          }
        } else if (str[i] === enter) {
          in_escape = true
          tmp += str[i]
        } else if (str[i] === exit) {
          in_escape = false
          tmp += str[i]
        } else if (
          str.substring(i, Math.min(i + split.length, str.length - 1)) ===
            split &&
          in_escape === false
        ) {
          // split at sym
          i += split.length - 1
          if (tmp) res.push(tmp)
          tmp = ""
        } else {
          // append a char to the match
          tmp += str[i]
        }
      }
      res.push(tmp)
      return res
    },
    tableLineSplit = (lines, width) => {
      // let lines = row[col].split("\n")
      let lines_output = []
      const goodSplitChars = /[ \.,\+_-]/g
      const validColorCodes = /^[a-zA-Z0-9]$/
      for (let k = 0; k < lines.length; k++) {
        // for these splits
        if (len_wo_colors(lines[k]) > width) {
          // if the line is longer than it should be
          let line_in_output = ""
          let in_color_code = false
          let after_color_code = false
          let remaining_input = lines[k]
          let ll = 0

          for (
            let l = 0;
            l < lines[k].length && remaining_input.length > 0;
            l++
          ) {
            let char = lines[k][l]
            let next_sign = remaining_input.substring(1).search(goodSplitChars)
            let netx_opportunity =
              next_sign === -1 ? remaining_input.length : next_sign + 2
            if (
              // if this is a color code char and there is more coming, or we already are in a color code
              char === "`" &&
              (count(remaining_input, "`") > 1 || in_color_code)
            ) {
              in_color_code = !in_color_code
              // true if we entered a color code, false if we exited
              after_color_code = in_color_code
              line_in_output += char
              remaining_input = remaining_input.substring(1)
            } else if (after_color_code) {
              // if we _just_ entered a color code, ergo if the last char was one
              // if this char is not a color quanitfier, we aren't in a color code at all
              if (!validColorCodes.test(char)) {
                in_color_code = false
                // this char and the invalid color code char
                ll += 2
              }
              after_color_code = false
              line_in_output += char
              remaining_input = remaining_input.substring(1)
            } else if (
              // if we have a split oppertunity, and the next one is too far away
              goodSplitChars.test(char) &&
              ll + netx_opportunity > width
            ) {
              // add this char
              line_in_output += char
              // end color code if nessecary
              if (in_color_code) line_in_output += "`"
              // if color coode would end with next char, skip one more char for next line
              if (in_color_code && remaining_input[1] === "`") {
                // color code ended with this line
                in_color_code = false
                remaining_input = remaining_input.substring(1)
              }
              // remove added char
              remaining_input = remaining_input.substring(1)
              lines_output.push(line_in_output)
              ll = 0

              // if we were still in a color code, take the same code for the next line
              if (in_color_code) {
                line_in_output =
                  "`" +
                  line_in_output[
                    line_in_output
                      .substring(0, line_in_output.length - 1)
                      .lastIndexOf("`") + 1
                  ]
              } else line_in_output = ""
            } else if (len_wo_colors(remaining_input) + ll <= width) {
              // the remaining input is shorter than what we cap to, so just add it
              line_in_output += remaining_input
              lines_output.push(line_in_output)
              remaining_input = ""
              line_in_output = ""
              ll = 0
            } else if (ll >= width - 1) {
              // if we have reached max width
              line_in_output += char
              if (in_color_code) line_in_output += "`"
              remaining_input = remaining_input.substring(1)
              // split to next line
              lines_output.push(line_in_output)
              line_in_output = in_color_code
                ? // if we were still in a color code we take it with us to the next line
                  "`" +
                  line_in_output[
                    line_in_output
                      .substring(0, line_in_output.length - 1)
                      .lastIndexOf("`") + 1
                  ]
                : ""
              ll = 0
            } else {
              // nothing special, just add the char
              ll++
              line_in_output += char
              remaining_input = remaining_input.substring(1)
            }
          }
        } else {
          // if the line first into the table
          lines_output.push(lines[k])
        }
      }
      return lines_output
    },
    allToString = arr => {
      for (let i of Object.keys(arr)) {
        if (typeof arr[i] == "object") allToString(arr[i])
        else arr[i] = String(arr[i])
      }
    },
    table = (
      rows,
      columns = Object.keys(rows[0]).map(el => {
        return { key: el, header: null }
      }),
      seperator = " | "
    ) => {
      allToString(rows)
      let column_names
      let warn = ""
      // for backwards compatability
      if (typeof columns[0] === "string") {
        column_names = columns
        warn +=
          "`Dusing strings as columns is deprecated, use objects with key property`\n"
      } else {
        column_names = columns.map(el => el.key)
      }

      // calculate width
      let fullWidth = context.cols - column_names.length * seperator.length
      let widths = {}
      let extra = fullWidth % column_names.length
      // set for every col
      for (let i = 0; i < column_names.length; i++) {
        widths[column_names[i]] = {}
        widths[column_names[i]].max = rows.reduce(
          (acc, el) =>
            acc < len_wo_colors(el[column_names[i]])
              ? len_wo_colors(el[column_names[i]])
              : acc,
          0
        )
        widths[column_names[i]].gets = Math.floor(
          fullWidth / column_names.length
        )
        let wants = widths[column_names[i]].max - widths[column_names[i]].gets
        widths[column_names[i]].gets = Math.min(
          widths[column_names[i]].gets,
          widths[column_names[i]].max
        )
        widths[column_names[i]].ratio =
          widths[column_names[i]].max / widths[column_names[i]].gets
        extra -= wants < 0 ? wants : 0
      }
      extra += (fullWidth / column_names.length) % 1 === 1 ? 1 : 0
      // reassign the spots that are extra if there is a row that wants it
      for (; extra > 0; ) {
        let max = column_names.reduce(
          (acc, el) =>
            acc ? (widths[acc].ratio < widths[el].ratio ? el : acc) : el,
          ""
        )
        if (widths[max].ratio === 1) break
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
          row[col] = tableLineSplit(
            String(row[col]).split("\n"),
            widths[col].gets
          ).join("\n")
        }
      }
      let row_strings = []
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i]
        let max_newlines = column_names.reduce(
          (acc, el) =>
            acc > count(row[el], "\n") + 1 ? acc : count(row[el], "\n") + 1,
          0
        )
        let tmp = ""
        for (let j = 0; j < column_names.length; j++) {
          let col = column_names[j]
          let lines = String(row[col]).split("\n")
          let seps = []
          for (; lines.length !== max_newlines; ) {
            lines.push(" ")
          }
          for (; seps.length !== max_newlines; ) {
            seps.push(seperator)
          }
          lines = lines.map(el => ljust(el, widths[col].gets))
          if (j === 0) tmp = lines.join("\n")
          else
            tmp = side_by_side(
              side_by_side(tmp, seps.join("\n")),
              lines.join("\n")
            )
        }
        row_strings.push(tmp)
      }

      let header_string = ""
      if (columns.reduce((acc, el) => (acc && el.header ? acc : false), true)) {
        let headers = {}
        columns.forEach(el => (headers[el.key] = el.header))

        for (let j = 0; j < column_names.length; j++) {
          let col = column_names[j]
          if (headers[col])
            headers[col] = tableLineSplit(
              headers[col].split("\n"),
              widths[col].gets
            ).join("\n")
        }

        let max_newlines = column_names.reduce(
          (acc, el) =>
            acc > count(headers[el], "\n") + 1
              ? acc
              : count(headers[el], "\n") + 1,
          0
        )
        for (let j = 0; j < column_names.length; j++) {
          let col = column_names[j]
          let lines = headers[col].split("\n")
          let seps = []
          for (; lines.length !== max_newlines; ) {
            lines.push(" ")
          }
          for (; seps.length !== max_newlines; ) {
            seps.push(seperator)
          }
          lines = lines.map(el => center(el, widths[col].gets))
          if (j === 0) header_string = lines.join("\n")
          else
            header_string = side_by_side(
              side_by_side(header_string, seps.join("\n")),
              lines.join("\n")
            )
        }
        header_string += "\n\n"
      }

      if (warn)
        warn +=
          "\nif you do not own this script, contact script owner\nbackwards compatability will not always be supported"
      return warn + header_string + row_strings.join("\n")
    },
    analyze_npc = loc => {
      let npc = loc.split(".")[0]
      let pieces = npc.split("_")
      let npc_prefixes = [
        "abandoned_",
        "abndnd_",
        "anon_",
        "anonymous_",
        "derelict_",
        "uknown_",
        "unidentified_",
        "unknown_"
      ]
      let cannpc = npc_prefixes.reduce(
        (acc, el) => acc || loc.startsWith(el),
        false
      )
      if (!cannpc) {
        // check everything categorized as a player for if it is PUBLIC HIDDEN, if so add to loc db
        // {loc :<loc>,user :<user>,added_by : (here:context.calling_script),added_time : <unix-timestamp>,collected_info : []}
        return { loc, type: "plr", diff: "plr" }
      }
      if (
        pieces.length === 3 &&
        pieces[1].length === 5 &&
        pieces[2].length === 6
      ) {
        let _diff = pieces[1].substring(0, 2)
        let _class = pieces[1].substring(2)
        let obj = { loc }
        obj.type = _class
        obj.diff = _diff
        return obj
      } else if (
        pieces.length === 3 &&
        pieces[1].length === 2 &&
        pieces[1] === "jr" &&
        pieces[2].length === 6
      ) {
        let obj = { loc }
        obj.type = "non"
        obj.diff = "jr"
        return obj
      } else {
        return { loc, type: "abn", diff: "plr" }
      }
    },
    locTable = (
      locs,
      agressivePlayerLabeling = false,
      useTable = false,
      headers = false
    ) => {
      let diffs = ["jr", "dd", "wb", "pr", "ls", "plr"]
      let order = [
        "`Xplayer`",
        "`xretired`",
        "`unone`",
        "`Mturtle`",
        "`Kstag`",
        "`Craven`",
        "`Oweaver`",
        "`Bwolf`"
      ]
      let rows = []
      let classes = {
        wlf: "`Bwolf`",
        wvr: "`Oweaver`",
        rvn: "`Craven`",
        stg: "`Kstag`",
        ttl: "`Mturtle`",
        plr: "`Xplayer`",
        abn: "`xretired`",
        non: "`unone`"
      }

      //analyze locs
      locs = locs.sort()
      locs.forEach(loc => {
        let a = analyze_npc(loc)
        a.type = classes[a.type]
        rows.push(a)
      })

      // sort
      rows.sort(
        (a, b) => diffs.indexOf(a.diff || "jr") - diffs.indexOf(b.diff || "jr")
      )
      rows.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
      // label unknown as player if wished so
      if (agressivePlayerLabeling)
        rows.forEach(el => {
          if (el.type === "`xretired`") {
            el.type = "`Xplayer`"
          }
        })

      // map number to diff string
      rows.forEach(el => {
        if (el.diff !== undefined)
          el.diff = "`" + "2JFDTu"[diffs.indexOf(el.diff)] + el.diff + "`"
        else el.diff = "  "
      })

      if (useTable)
        // will split to new lines if your client width is small
        return table(rows, [
          { key: "loc", header: headers ? "`Yloc`" : null },
          { key: "diff", header: headers ? "`Ydiff`" : null },
          { key: "type", header: headers ? "`Yclass`" : null }
        ])
      // will only split if loc doesn#t fit on screen, but may cause linewrap resulting in wierd looking lists
      return (
        (headers ? center("`Yloc`", 44) + "`Ydiff class`\n\n" : "") +
        rows
          .map(el => ljust(el.loc, 45) + " " + el.diff + " " + el.type)
          .join("\n")
      )
    },
    upgrade_parser = (ups, json = false, additional_values = []) => {
      // takes an array of upgrades and returns either a string or an array with the upgrades stripped to their important stats
      const important_stats = {
        CON_SPEC: ["p1_len", "p2_len"],
        acct_nt: ["acct_nt_min"],
        sn_w_glock: ["expire_secs", "max_glock_amnt"],
        sn_w_usac: ["salt_digits"],
        magnara: ["magnara_len"],
        shfflr: [
          "rarity_count",
          "name_count",
          "up_count_min",
          "up_count_max",
          "digits"
        ],
        l0g_wr1t3r: ["loc_count"],
        char_count: ["chars"],
        public_script: ["slots"],
        script_slot: ["slots"],
        channel_count: ["count"],
        balance: ["cooldown"],
        expose_access_log: ["cooldown", "count"],
        expose_upgrade_log: ["cooldown", "count"],
        expose_upgrades: ["cooldown"],
        log_writer: ["cooldown"],
        transactions: ["cooldown", "count"],
        transfer_upgrade: ["cooldown", "count"],
        transfer: ["cooldown", "amount"],
        w4rn_message: ["cooldown"],
        DATA_CHECK: ["acc_mod"],
        l0cket: ["count"],
        l0ckbox: ["count"],
        l0ckjaw: ["count", "expire_secs"],
        cron_bot: ["cooldown", "cost", "retries", "fails"],
        k3y: ["k3y"]
      }
      const ups_stats_filtered = ups.map(el => {
        const up = {
          name: el.name,
          rarity: el.rarity,
          i: el.i,
          loaded: el.loaded
        }
        const name = /_(V|v)[0-4]$/.test(up.name)
          ? up.name.substring(0, up.name.length - 3)
          : up.name
        if (Object.keys(important_stats).includes(name))
          //@ts-ignore
          for (let stat of [...important_stats[name], ...additional_values]) {
            try {
              //@ts-ignore
              up[stat] = el[stat]
            } catch {}
          }

        //@ts-ignore
        if (el.sid) up.sid = "`B" + el.sid + "`"
        return up
      })
      if (json) return ups_stats_filtered
      const longest = ups_stats_filtered.reduce(
        (acc, el) => Math.max(acc, el.name.length),
        0
      )
      return ups_stats_filtered.map(el => {
        let str = `\`${el.loaded ? "V" : 0}${rjust(String(el.i), 3, "0")}\` \`${
          el.rarity
        }${ljust(el.name, longest)}\``
        for (let k of Object.keys(el)) {
          if (["loaded", "i", "rarity", "name"].includes(k)) continue
          str += ` | \`N${k}\`:\`V${el[k]}\``
        }
        return str
      })
    },
    upgrade_viewer = ups => {
      const r = []
      for (let up of ups) {
        let u = []
        u.push(
          "`" +
            (up.loaded ? "V" : "C") +
            rjust(up.i?.toString() || "null", 3, "0") +
            "`"
        )
        u.push(["", "`CT1`", "`AT2`", "`PT3`", "`TT4`"][up.tier])
        u.push(`\`${up.rarity}${up.name}\``)

        const time = ["cooldown", "expire_secs"]
        const gc = ["cost", "max_glock_amnt", "amount"]
        const char = ["chars"]
        const slot = ["slots"]
        const count = [
          "count",
          "p1_len",
          "p2_len",
          "loc_count",
          "salt_digits",
          "acct_nt_min",
          "magnara_len"
        ]
        const cd = ["last_time"]
        const str = ["k3y"]
        const percent = ["acc_mod"]

        if (up.sid) u.push("`M" + up.sid + "`")

        if (up.type === "bot_brain") {
          u.push(to_time_str(up.cooldown))
          u.push(to_gc_str(up.cost))
          u.push((up.fails ? up.fails + "/" : "") + up.retries + "`Cr`")
          if (up.last_run)
            u.push(
              to_time_str(
                up.cooldown - Math.floor((Date.now() - up.last_run) / 1000)
              )
            )
          else u.push("`Cinactive`")
          r.push(u)
          continue
        }

        if (up.type === "glam") {
          u.push(up.event)
          r.push(u)
          continue
        }

        if (up.name === "shfflr") {
          u.push(`${up.up_count_min}-${up.up_count_max}\`Cups\``)
          u.push(`${up.name_count}\`Cnc\``)
          u.push(`${up.rarity_count}\`Crc\``)
          u.push(`${up.digits}\`Cd\``)
        }

        for (let key in up) {
          if (time.includes(key)) u.push(to_time_str(up[key]))
          else if (gc.includes(key)) u.push(to_gc_str(up[key]))
          else if (cd.includes(key)) {
            const t = up.cooldown - (Date.now() - up.last_time)
            u.push(to_time_str(Math.floor(t / 1000)))
          } else if (char.includes(key)) u.push(up[key] + "`Cch`")
          else if (slot.includes(key)) u.push(up[key] + "`Csl`")
          //@ts-ignore
          else if (count.includes(key))
            u.push(rjust(up[key].toString(), 2, "0") + "`Cc`")
          else if (str.includes(key)) u.push("`B" + up[key] + "`")
          else if (percent.includes(key)) u.push("`B" + up[key] + "%`")
        }

        r.push(u)
      }
      const re = r.map(el => {
        let a = el.shift()
        let b = el.shift()
        let c = el.shift()
        return [`${a} ${b} ${c}`, ...el]
      })

      const m0 = re.reduce((a, b) => Math.max(a, len_wo_colors(b[0])), 0) + 1
      const m1 = re.reduce((a, b) => Math.max(a, len_wo_colors(b[1] || "")), 0)
      const m2 = re.reduce((a, b) => Math.max(a, len_wo_colors(b[2] || "")), 0)
      const m3 = re.reduce((a, b) => Math.max(a, len_wo_colors(b[3] || "")), 0)
      const m4 = re.reduce((a, b) => Math.max(a, len_wo_colors(b[4] || "")), 0)
      const ret = re.map(el => {
        let a = ljust(el[0] || "", m0)
        let b = rjust(el[1] || "", m1)
        let c = ljust(el[2] || "", m2)
        let d = rjust(el[3] || "", m3)
        let e = ljust(el[4] || "", m4)
        return `${a} ${b} ${c} ${d} ${e}`
      })
      return ret
    },
    to_gc_str = amt => {
      if (amt === 0) return ""
      let s = amt > 0 ? "" : "-"
      amt = Math.abs(amt)

      let Q = Math.floor(amt / 1_000_000_000_000_000)
      let T = Math.floor(amt / 1_000_000_000_000) % 1000
      let B = Math.floor(amt / 1_000_000_000) % 1000
      let M = Math.floor(amt / 1_000_000) % 1000
      let K = Math.floor(amt / 1_000) % 1000
      let S = amt % 1000
      if (Q > 0) s += Q + "Q"
      if (T > 0) s += T + "T"
      if (B > 0) s += B + "B"
      if (M > 0) s += M + "M"
      if (K > 0) s += K + "K"
      if (S > 0) s += S
      s += "GC"
      return s
    },
    to_time_str = secs => {
      let r = secs > 0 ? "" : "-"
      secs = Math.abs(secs)
      let d = Math.floor(secs / 86400)
      let h = Math.floor(secs / 3600) % 24
      let m = Math.floor(secs / 60) % 60
      let s = secs % 60
      if (d > 0) r += `\`B${d}\`\`Gd\``
      if (h > 0) r += `\`B${h}\`\`Gh\``
      if (m > 0) r += `\`B${m}\`\`Km\``
      if (s > 0) r += `\`B${s}\`\`Ms\``
      return r
    }
  if (!context.calling_script)
    return "`Ythis is a ui library used by shira products`\nsee\nhttps://github.com/1shira/hackmud/blob/main/shira.uilib.js"
  return {
    rjust,
    ljust,
    center,
    side_by_side,
    len_wo_colors,
    count,
    table,
    analyze_npc,
    locTable,
    tableLineSplit,
    upgrade_parser,
    to_time_str,
    to_gc_str,
    upgrade_viewer
  }
}
