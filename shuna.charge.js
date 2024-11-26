function(context,args) { // authorize:"scripts.user", amount:"1MGC", duration:"30d"
    if(#FMCL) return {ok:!1,msg:"shuna.charge: can only be called once per script execution"}
    if(!args) return `
\`5Welcome to shuna.charge, a shuna.bank product\`

\`YThis is a script meant to be a lower-fee replacement to escrow.charge\`
\`Yit works by transfering money in shuna.bank between bank accounts.\`

\`Yanyone can use this script in their's, the standard fee is \`\`22%\`\`u (0.5% less than escrow)\`
\`Yby becoming a shuna.bank partner, you can get an even lower fee\`
\`Yto do this, contact shuna (or shira)\`

\`Nview\`
\`Vsource\`  https://github.com/1shira/hackmud/blob/main/shuna.charge.js
\`setup\`
\`Vusage\`

    `
    if(args.view === "source") return $fs.scripts.quine()
    if(args.view === "setup") return "If you don't have a shuna.bank account yet, create one with shuna.bank { register:true }\n\nrun shuna.charge { authorize:\"<script>\",amount:\"<maximum_charge>\" } to allow scripts\n\nIf you don't have enought GC in your account, once a script actually charges you, the charge will not go through\n\nscripts can allow you to choose an account to use, refer to the script you're using for wich args to use, there is no guarantee all scripts support this feature"
    if(args.view === "usage") return `
to authorize a script use authorize:"<script>", amount:<gc string or num>
you can specify authorization duration with duration:<time string> (default 30d if ommited)
you can specify an account with account:"<account name>" (default caller)
you can add once:true to only authorize the script for one run  

to use this script in your script to charge add these lines:
var res = #fs.shuna.charge({amount:"<gc string or num>"})
if(!res.ok) return res

you can specify an account the gc goes to with to:"<account name>" (default script creator)
you can let your users use a account of their choosing by asking them for an account and passing account:"<account name>" (default caller)
it is recommended to call this argumen \`Nbankaccount\`
    `
    var READ = (s) => $db.f(s),
    UPDATE = (s,n) => $db.u(s,{"$set":n}),
    // time string parsing
    lengths = [86400000,3600000,60000,1000],
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
    },
    // caharge authorisation checks
    lib = $fs.scripts.lib(),
    account = READ({s:"bank", u: args ? (args.account ? args.account : context.caller) : context.caller}).first(),
    auth = () => context.caller == account.u ? true : account.a.includes(context.caller),
    authu = (u) => u == account.u ? true : account.a.includes(u),
    auth_script = () => {
        let tokens = account.tokens
        if(!account.tokens) account.tokens = []
        // remove expired tokens
        tokens = tokens.filter((token) => (token.date + token.duration) > lib.get_date_utcsecs())
        // remove tokens added by users that are no longer authorized
        tokens = tokens.filter((token) => authu(token.by))
        // push to db if tokens got removed
        if(tokens !== account.tokens) UPDATE({s:"bank",u:account.u},{tokens:account.tokens})
            
            //check if script is alloed to take amount
            let this_scripts_tokens = tokens.filter((token) => token.script === context.calling_script)
            let authorized = this_scripts_tokens.filter((token) => token.amount >= args.amount)
            
            if(authorized && authorized.length > 1) // this _should_ never happen
            return {ok:!1,msg:"internal error, contact shuna"}
            
            // if one-time token, authorize once and remove token
            if(authorized && authorized.length > 0 && authorized[0].once){
                tokens = tokens.filter((el) => el.calling_script === context.calling_script && el.amount === args.amount && !el.once)
                UPDATE({s:"bank",u:account.u},{tokens:account.tokens})
                
                return true
            }
            
            if(authorized) return true
            return false
        },
        // fee calculation
        calcFees = (fees, amount) => {
            // {flat:number,percent:number}
            let total = 0
            total += fees.flat || 0
            if(fees.percent) total += Math.floor((fees.percent/100) * amount)
                return total
        }
        // let a script charge a fee
        if(context.calling_script){
            if(!args.amount) return {ok:!1, msg:"shuna.charge: no amount given, contact script owner"}
            if(typeof args.amount !== "number") args.amount = lib.to_gc_num(args.amount)
            // check if account exists
            if(!account) return {ok:!1,msg:"shuna.charge: shuna.bank account does not exist"}
            // check auth
            if(!auth()) return {ok:!1,msg:"shuna.charge: no authorization for the account charged"}
            if(!auth_script()) return {ok:!1,msg:"shuna.charge: this script is not authorized, authorize by running shuna.charge { authorize:\"" + context.calling_script + "\", amount:" + args.amount + " }"}
            
            let script_account = READ({s:"bank",u:context.calling_script.split('.')[0]}).first(),
            recieving_account = args.to ? READ({s:"bank",u:args.to}).first() : script_account,
            
            // if isn't partner charge 2% (= escrow fee - 0.5%) (on transaction/deposit)
            // if is partner (has custom fees) charge based on their tarif
            // never charge fee on caller
            fee = calcFees(script_account.fees ? script_account.fees.charge || {percent: 2} : {percent: 2},args.amount)
            
            if(isNaN(fee) || isNaN(args.amount)) return {ok:!1,msg:"shuna.charge: internal error, contact shuna"}
            
            if(account.b < args.amount) return {ok:!1,msg:"shuna.charge: Balance of " + lib.to_gc_str(account.b) + " is too low to send" + lib.to_gc_str(args.amount)}
            // for showing stats cause I didn't want to have a million db calls in here
            $fs.shuna.analytics({context,amt:args.amount})
            // transaction  
            if(recieving_account.u === account.u) return {ok:!0}
            
            account.b -= args.amount
            recieving_account.b += args.amount - fee
            
            UPDATE({s:"bank",u:account.u},{b:account.b})
            UPDATE({s:"bank",u:recieving_account.u},{b:recieving_account.b})
        // notify caller 
        $fs.chats.tell({to:"shuna",msg:`\`Y${context.calling_script} charged ${lib.to_gc_str(args.amount)} on ${account.u}\``})

        return {ok:!0}
    }
    // let a user authorize a script to charge them
    if(args.authorize){
        // security checks
        if(context.calling_script || context.is_scriptor ) return {ok:!1,msg:"You cannot authorize a script from a script"}
        if(!account) return {ok:!1, msg:"You do not have an account at shuna.bank, create one or use an existing on with account:\"<account name>\""}
        if(!auth()) return {ok:!1,msg:"You are not authorized for that account"}
        // argument checks
        if(!args.amount) return {ok:!1,msg:"You need to add an `Namount` that this script is allowed to take"}
        if(!$fs.scripts.get_level({name:args.authorize})) return {ok:!1,msg:"script does not exist"}
        
        if(typeof args.amount !== "number") args.amount = lib.to_gc_num(args.amount)
        if(isNaN(args.amount)) return {ok:!1,msg:"internal error, contact shuna"}

        if(!account.tokens) account.tokens = []

        var time = parseTime(args.duration || "30d")
        if(!time) return {ok:!1,msg:"wrong duration time string, format : \"1d1h1m1s\""}

        // remove tokens that grant the same script the same amount
        account.tokens = account.tokens.filter((el) => el.script !== args.authorize && el.amount > args.amount)
        // add new token
        account.tokens.push({script:args.authorize,amount:args.amount,date:lib.get_date_utcsecs(),by:context.caller,once:args.once || false,duration:time})

        UPDATE({s:"bank",u:account.u},{tokens:account.tokens})
        return {ok:!0,msg:"script " + args.authorize + " has been authorized to take " + lib.to_gc_str(args.amount) + (args.once ? " once" :  " once per script call by an authorized user") }
    }
    return "`Yunknown command, call without args (w/o {}) for usage information`"
}
