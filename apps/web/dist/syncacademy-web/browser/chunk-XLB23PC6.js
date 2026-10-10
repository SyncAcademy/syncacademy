function t(n,o){return n.map((r,e)=>({row:r,index:e})).sort((r,e)=>(o(e.row)??"").localeCompare(o(r.row)??"")||e.index-r.index).map(({row:r})=>r)}export{t as a};
