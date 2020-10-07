export const EVENTNATIVE_HOST = "https://track.ksense.io";

export function getEmpeddedJS(key) {
return `
    !function(t){try{var e,n=t.tracking_host,r=(t.script_path||"/")+"s/track.js",i=window.eventN||(window.eventN={});i.eventsQ=e=i.eventsQ||(i.eventsQ=[]);var a=function(t){i[t]=function(){for(var n=arguments.length,r=new Array(n),i=0;i<n;i++)r[i]=arguments[i];return e.push([t].concat(r))}};a("track"),a("id"),a("init"),i.init(t);var c=document.createElement("script");c.type="text/javascript",c.async=!0,c.src=(n.startsWith("https://")||n.startsWith("http://")?n:location.protocol+"//"+n)+r;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(c,s)}catch(t){console.log("EventNative init failed",t)}}({
        "key": "${key}",
        "segment_hook": false,
        "tracking_host": "${EVENTNATIVE_HOST}",
        "ga_hook": false
    });
`;
}

