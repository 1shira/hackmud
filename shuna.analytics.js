function(context,args){
    // script: "shuna.charge", calling_script:"shira._t2", user:"shira",ref:"fee", level:"sum/all",time:"30d"
    var query = {type:"analytics"},lib=$fs.scripts.lib()
    if(context.calling_script){
        query.script = context.calling_script
        if(args){
            if(args.context) {
                query.calling_script = args.context.calling_script
            }

            if(args.ref) query.ref = args.ref
        }
        query.user = context.caller
        
        let stat = $db.f(query).first() || {count:0}
        stat.count++
        stat.last = lib.get_date_utcsecs()

        if(args && args.amt){
            if(typeof args.amt == "string")  args.amt = lib.to_gc_num(args.amt)
            stat.amt = stat.amt ? stat.amt + args.amt : args.amt
        }
        if(args && args.context && args.context.this_script === "shuna.charge"){
            var calcFees = (fees, amount) => {
                // {flat:number,percent:number}
                let total = 0
                total += fees.flat || 0
                if(fees.percent) total += Math.floor((fees.percent/100) * amount)
                return total
            }
            let script_account = $db.f({s:"bank",u:args.context.calling_script.split('.')[0]}).first(),
            fee = calcFees(script_account.fees ? script_account.fees.charge || {percent: 2} : {percent: 2},args.amt)
            stat.fee = stat.fee ? stat.fee + fee : fee
        }

        $db.us(query,{"$set":stat})
        return  
    }
    // I will add an option for users to see their own usage of my products eventually
    // but the actual statistics are private for now
    let onWhitelist = $db.f({ u: context.caller, s: 'WHITELIST' }).first()
    if(!onWhitelist) return "`Dunauthorized`"
    var lengths = [86400,3600,60,1],
    dhms = ["d","h","m","s"],
    parseTime = (timeString) => {
        try{
            let total = 0
            for(let i = 0; i< dhms.length;i++){
                timeString = timeString.split(dhms[i])
                if(timeString.length > 1) 
                {
                    total += Number(timeString[0]) * lengths[i]
                    timeString = timeString[1]
                }
                else timeString = timeString[0]
            }
            if(typeof total !== "number") return false
            return total
        }
        catch
        {
            return false
        }
    }
    if(args){
        if(args.script) query.script = args.script
        if(args.calling_script) query.calling_script = args.calling_script
        if(args.user) query.user = args.user
        if(args.ref) query.ref = args.ref
        if(args.time) query.last = {$gte:lib.get_date_utcsecs() - (parseTime(args.time) * 1000 || 2592000000)} // 30d standard
    }

    // get stats
    var stats = $db.f(query).array(),
    aggregate = (data) => {
        // Data: [{script,calling_script?,ref?,user,count,last,amt?}]
        // SELECT script, calling_script, SUM(count),SUM(amt), MAX(last) FROM data GROUP BY script, calling_script, ref
        var res = {},result = []
        
        for(let i = 0;i < data.length;i++){
            let stat = data[i]
            let id = stat.script
            if(stat.calling_script) id += stat.calling_script
            if(stat.ref) id += stat.ref
            id.replace(".","#")
            if(!res[id]) res[id] = stat
            else {
                if(stat.amt) res[id].amt = res[id].amt ? res[id].amt + stat.amt : stat.amt
                res[id].count += stat.count
                if(res[id].last < stat.last){
                    res[id].last = stat.last
                    res[id].user = stat.user
                }
            }
        }
        for(let [key,value] of Object.entries(res)){
            if(!args || !args.keepid) 
            {
                delete(value.id)
                delete(value._id)
            }
            delete(value.type)
            value.last_user = value.user
            delete(value.user)
            if(value.amt) value.amt = lib.to_gc_str(value.amt)
            value.last = lib.to_game_timestr(new Date(value.last))
            result.push(value)
        }

        return result
    }

    if(!args){
        return aggregate(stats)
    }

    // give stats or compute based on level, standard all, only if no filters use sum
    if(args.level == "sum") return aggregate(stats)
    stats.map(el => el._id = undefined)
    stats.map(el => el.type = undefined)
    stats.map(el => el.amt ? el.amt = lib.to_gc_str(el.amt) : el)
    stats.map(el => el.last = lib.to_game_timestr(new Date(el.last)))
    if(args.script) stats.map(el => el.script = undefined)
    if(args.calling_script) stats.map(el => el.calling_script = undefined)
    if(args.user) stats.map(el => el.user = undefined)
    if(args.ref) stats.map(el => el.ref = undefined)
    return {query,stats}
}
