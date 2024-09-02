function (context,args) {
    let wl = $db.f({s:"WHITELIST",u:context.caller}).first()
    let ws = $db.f({s:"SCRIPTS_WHITELIST",u:context.calling_script}).first()
    if(!wl && !ws) return {ok:!1,msg:"`X403`"}
    let f = (q, p) => {
        q = JSON.parse(JSON.stringify(q || {}))
        p = p && JSON.parse(JSON.stringify(p))
        return $db.f(q, p)
    }
    let i = (o) => {
        o = JSON.parse(JSON.stringify(o || {}))
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
    let us = (q,c) => {
        q = JSON.parse(JSON.stringify(q || {}))
        if(!c) return {ok:!1}
        c = c && JSON.parse(JSON.stringify(c))
        return $db.us(q, c)
    }
    return {f,i,r,u,us}
}
