const http=require("http");
const {URL}=require("url");

const handlers={
  "/api/search":require("./api/search"),
  "/api/providers":require("./api/providers")
};

function makeRes(nodeRes){
  return {
    status(code){
      nodeRes.statusCode=Number(code)||200;
      return this;
    },
    setHeader(name,value){
      nodeRes.setHeader(name,value);
      return this;
    },
    json(payload){
      if(!nodeRes.headersSent) nodeRes.setHeader("Content-Type","application/json; charset=utf-8");
      nodeRes.end(JSON.stringify(payload));
    },
    send(payload){
      if(payload&&typeof payload==="object") return this.json(payload);
      nodeRes.end(String(payload??""));
    },
    end(payload){
      nodeRes.end(payload);
    }
  };
}

const server=http.createServer(async (req,res)=>{
  try{
    const url=new URL(req.url,"http://localhost");
    if(url.pathname==="/health"){
      res.writeHead(200,{"Content-Type":"application/json"});
      return res.end(JSON.stringify({ok:true,service:"dealzy-staging-api"}));
    }

    const handler=handlers[url.pathname];
    if(!handler){
      res.writeHead(404,{"Content-Type":"application/json"});
      return res.end(JSON.stringify({ok:false,error:"not-found"}));
    }

    const query={};
    for(const [key,value] of url.searchParams.entries()) query[key]=value;
    const vReq={method:req.method||"GET",query,headers:req.headers,url:req.url};
    const vRes=makeRes(res);
    await handler(vReq,vRes);
  }catch(error){
    console.error(error);
    if(!res.headersSent) res.writeHead(500,{"Content-Type":"application/json"});
    res.end(JSON.stringify({ok:false,error:"internal-error"}));
  }
});

const port=Number(process.env.PORT)||8080;
server.listen(port,"0.0.0.0",()=>console.log("Dealzy staging API listening on",port));
