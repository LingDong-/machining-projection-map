let urlq = new URLSearchParams(window.location.search)

let W = urlq.get('w')||1280;
let H = urlq.get('h')||720;

let H_forw = [1,0,0, 0,1,0, 0,0];
let H_back = [1,0,0, 0,1,0, 0,0];

const TOOL_FREEHAND = 0;
const TOOL_POLY = 1;

let SCALE = 1;

let tool = TOOL_FREEHAND;


function approxPolyDP(polyline, epsilon){
  // https://en.wikipedia.org/wiki/Ramer–Douglas–Peucker_algorithm
  // David Douglas & Thomas Peucker, 
  // "Algorithms for the reduction of the number of points required to 
  // represent a digitized line or its caricature", 
  // The Canadian Cartographer 10(2), 112–122 (1973)

  function pointDistanceToSegment(p, p0, p1) {
    // https://stackoverflow.com/a/6853926
    let x = p[0];   let y = p[1];
    let x1 = p0[0]; let y1 = p0[1];
    let x2 = p1[0]; let y2 = p1[1];
    let A = x - x1; let B = y - y1; let C = x2 - x1; let D = y2 - y1;
    let dot = A*C+B*D;
    let len_sq = C*C+D*D;
    let param = -1;
    if (len_sq != 0) {
      param = dot / len_sq;
    }
    let xx; let yy;
    if (param < 0) {
      xx = x1; yy = y1;
    }else if (param > 1) {
      xx = x2; yy = y2;
    }else {
      xx = x1 + param*C;
      yy = y1 + param*D;
    }
    let dx = x - xx;
    let dy = y - yy;
    return Math.sqrt(dx*dx+dy*dy);
  }
  
  if (polyline.length <= 2){
    return polyline;
  }
  let dmax   = 0;
  let argmax = -1;
  for (let i = 1; i < polyline.length-1; i++){
    let d = pointDistanceToSegment(polyline[i], 
                                   polyline[0], 
                                   polyline[polyline.length-1]);
    if (d > dmax){
      dmax = d;
      argmax = i;
    }  
  }
  // console.log(dmax)
  let ret = [];
  if (dmax > epsilon){
    let L = approxPolyDP(polyline.slice(0,argmax+1),epsilon);
    let R = approxPolyDP(polyline.slice(argmax,polyline.length),epsilon);
    ret = ret.concat(L.slice(0,L.length-1)).concat(R);
  }else{
    ret.push(polyline[0].slice());
    ret.push(polyline[polyline.length-1].slice());
  }
  return ret;
}

function drawable_canvas(w,h){
  let cnv = document.createElement("canvas");
  cnv.style="border:1px solid black"
  cnv.width = w;
  cnv.height = h;
  let ctx = cnv.getContext('2d');
  ctx.fillStyle="white";
  ctx.fillRect(0,0,cnv.width,cnv.height);

  cnv.Q =  [[0,400],[400,400],[0,400],[0,0]];

  let drawing = [];
  let wip = [];

  let mouseX = 0;
  let mouseY = 0;
  let mouseIsDown = false;
  let poly_state = 0;
  document.addEventListener('mousemove',function(e){
    let r = cnv.getBoundingClientRect();
    mouseX = e.clientX-r.left;
    mouseY = e.clientY-r.top;

    if (dragged >= 0){
      cnv.Q[dragged][0] = mouseX;
      cnv.Q[dragged][1] = mouseY;
      recomp_H();
      drawing.splice(0,Infinity);
      sync_canvas();
    }else if (mouseIsDown){
      if (tool == TOOL_FREEHAND){
        wip.push([mouseX,mouseY]);
      }
    }
  })
  let dragged = -1;
  document.addEventListener('mousedown',function(){
    if (mouseX < 0 || mouseX > w || mouseY < 0 || mouseY > h){
    }else{
      mouseIsDown = true;
    }
    
    for (let i = 0; i < cnv.Q.length; i++){
      let [x,y] = cnv.Q[i];
      let d = Math.hypot(mouseX-x,mouseY-y);
      if (d < 15){
        dragged = i;
        return;
      }
    }
    if (mouseIsDown){
      if (tool == TOOL_FREEHAND){
        wip.splice(0,Infinity,[mouseX,mouseY]);
      }else if (tool == TOOL_POLY){
        if (poly_state == 0){
          wip.splice(0,Infinity,[mouseX,mouseY]);
          poly_state = 1;
        }else{
          wip.push([mouseX,mouseY]);
        }
      }
    }
  })
  function push_wip(){
    let p = FindContours.approxPolyDP(wip,0.5);
    if (p.length > 1){
      drawing.push(p); 
    }
    wip = [];
  }
  document.addEventListener('mouseup',function(){
    mouseIsDown = false;
    dragged = -1;
    if (tool == TOOL_FREEHAND){
      push_wip();
      sync_canvas();
    }
  });
  document.addEventListener("keypress",function(event){
    if (event.key === "Enter") {
      if (tool == TOOL_POLY && poly_state == 1){
        if (mouseX < 0 || mouseX > w || mouseY < 0 || mouseY > h){
        }else{
          push_wip();
          sync_canvas();
          poly_state = 0;
        }  
      }else{
        for (let i = 0; i < cnv.Q.length; i++){
          let [x,y] = cnv.Q[i];
          let d = Math.hypot(mouseX-x,mouseY-y);
          if (d < 15){
            let ret = prompt("enter coordinates:");
            if (ret){
              let [x,y] = ret.split(",").map(a=>Number(a));
              cnv.Q[i][0] = SCALE*x;
              cnv.Q[i][1] = SCALE*y;
              recomp_H();
              cnv0.drawing.splice(0,Infinity);
              sync_canvas();
              return;
            }
          }
        }
      }
    }
  })
  cnv.getMouse = function(){
    return [mouseX,mouseY,mouseIsDown];
  }

  function loop(){
    requestAnimationFrame(loop);
    ctx.fillStyle="white";
    ctx.fillRect(0,0,w,h);

    ctx.strokeStyle="blue";
    draw_quad(ctx,cnv.Q);

    ctx.strokeStyle="black";
    for (let i = 0; i < drawing.length; i++){
      ctx.beginPath();
      for (let j = 0; j < drawing[i].length; j++){
        ctx[j?'lineTo':'moveTo'](...drawing[i][j]);
      }
      ctx.stroke();
    }
    if (tool == TOOL_POLY){
      if (poly_state == 1){
        ctx.beginPath();
        ctx.moveTo(...wip[wip.length-1]);
        ctx.lineTo(mouseX,mouseY);
        ctx.stroke();
      }
    }
    if (tool == TOOL_FREEHAND || tool == TOOL_POLY){
      ctx.beginPath();
      for (let j = 0; j < wip.length; j++){
        ctx[j?'lineTo':'moveTo'](...wip[j]);
      }
      ctx.stroke();
    }
    // ctx.fillStyle="blue";
    // draw_circle(ctx,mouseX,mouseY,5);
    ctx.strokeStyle="blue";
    ctx.beginPath();
    ctx.moveTo(mouseX-20,mouseY); ctx.lineTo(mouseX+20,mouseY);
    ctx.moveTo(mouseX,mouseY-20); ctx.lineTo(mouseX,mouseY+20);
    ctx.stroke();
  } 
  
  loop();
  
  cnv.drawing = drawing;
  return cnv;
}


function draw_circle(ctx,x,y,r){
  ctx.beginPath();
  ctx.ellipse(x,y,r,r,0,0,Math.PI*2);
  ctx.fill();
}

function draw_quad(ctx,P){
  ctx.beginPath();
  ctx.moveTo(...P[0]);
  ctx.lineTo(...P[1]);
  ctx.lineTo(...P[2]);
  ctx.lineTo(...P[3]);
  ctx.lineTo(...P[0]);
  ctx.stroke();
  draw_circle(ctx,...P[0],10);ctx.stroke();
  draw_circle(ctx,...P[1],10);ctx.stroke();
  draw_circle(ctx,...P[2],10);ctx.stroke();
  draw_circle(ctx,...P[3],10);ctx.stroke(); 
}


function recomp_H(){
  H_forw.splice(0,Infinity,...computeHMatrix(...cnv1.Q.flat(),...cnv0.Q.flat()));
  H_back.splice(0,Infinity,...computeHMatrix(...cnv0.Q.flat(),...cnv1.Q.flat()));
}


function sync_canvas(){
  // console.log(cnv0.drawing.length,cnv1.drawing.length)
  while (cnv0.drawing.length > cnv1.drawing.length){
    
    let dr0 = cnv0.drawing[cnv1.drawing.length];
    let dr1 = [];
    for (let j = 0; j < dr0.length; j++){
      let [x,y] = dr0[j];
      let [u,v] = applyHMatrix(H_forw,x,y);
      // console.log(x,y,u,v)
      dr1.push([u,v]);
    }
    cnv1.drawing.push(dr1);
  }
  while (cnv1.drawing.length > cnv0.drawing.length){
    let dr0 = cnv1.drawing[cnv0.drawing.length];
    let dr1 = [];
    for (let j = 0; j < dr0.length; j++){
      let [x,y] = dr0[j];
      let [u,v] = applyHMatrix(H_back,x,y);
      dr1.push([u,v]);
    }
    cnv0.drawing.push(dr1);
  }
}

let win;

function mirror(){
  win = window.open('');
  
  let cnv = win.document.createElement("canvas");
  cnv.width = W;
  cnv.height = H;
  let ctx = cnv.getContext('2d');
  win.document.body.appendChild(cnv);
  function loop(){
    requestAnimationFrame(loop);
    ctx.drawImage(cnv1,0,0,W,H);
  }
  cnv.onclick = function(){
    cnv.requestFullscreen()
  }
  win.canvas = cnv;
  loop();
}


let cnv0 = drawable_canvas(W,H);
let ctx0 = cnv0.getContext('2d');
let cnv1 = drawable_canvas(W,H);
let ctx1 = cnv1.getContext('2d');



cnv0.Q = [
  [0,0],[400,0],[400,400],[0,400],
]

cnv1.Q = [
  [200,100],[400,100],[300,400],[100,300],
]

recomp_H();


function add_button(name,func){
  let btn = document.createElement("button");
  btn.innerHTML = name
  document.body.appendChild(btn);
  btn.onclick = function(){
    func();
  };
}

function add_checkbox(name,func_on,func_off){
  let inp = document.createElement("input");
  let div = document.createElement("span");
  let lbl = document.createElement("span");
  inp.type = "checkbox"
  lbl.innerHTML = name+" ";
  div.appendChild(inp);
  div.appendChild(lbl);
  document.body.appendChild(div);
  inp.onchange = function(){
    if (inp.checked){
      func_on();
    }else{
      func_off();
    }
  };
}

function add_select(names,funcs){
  let sel = document.createElement("select");
  for (let i = 0; i < names.length; i++){
    let opt = document.createElement("option");
    opt.innerHTML = names[i];
    sel.appendChild(opt);
  }
  sel.onchange = function(){
    funcs[sel.selectedIndex]();
  }
  document.body.appendChild(sel);
}

function add_input(name,func,defau){
  let div = document.createElement("span");
  let inp = document.createElement("input");
  inp.value = defau || "";
  if (defau){
    inp.style.width = (defau.length+4) + "ch";
  }

  let btn = document.createElement("button");
  btn.innerHTML = "set";
  document.body.appendChild(btn);
  btn.onclick = function(){
    func(inp.value);
    console.log("OK.")
  }
  inp.onkeydown = function(event){
    if (event.key == "Enter"){
      console.log('enter');
      btn.click();
    }
  }
  div.innerHTML = " "+name+": ";
  div.appendChild(inp);
  div.appendChild(btn);
  document.body.appendChild(div);
}

function add_textarea(name,btn_name,func,defau,parent){
  let div = document.createElement("div");
  let inp = document.createElement("textarea");
  inp.value = defau || "";
  let btn = document.createElement("button");
  btn.innerHTML = btn_name;
  document.body.appendChild(btn);
  btn.onclick = function(){
    func(inp);
  }
  div.innerHTML = name+": ";
  div.appendChild(btn);
 
  div.appendChild(document.createElement("br"))
  div.appendChild(inp);
  inp.style.width=250;
  inp.style.height=200;

  if (!parent) parent = document.body;

  parent.appendChild(div);
}


add_button("mirror",function(){
  mirror();
});
add_checkbox("invert",function(){
  if (win){
    win.canvas.style.filter = "invert(100%)";
  }
}, function(){
  if (win){
    win.canvas.style.filter = "";
  }
});

add_checkbox("flip",function(){
  cnv0.style.transform = "scaleY(-1)";
}, function(){
  cnv0.style.transform = "";
});

add_select(["freehand","polygon"],[function(){tool=TOOL_FREEHAND},function(){tool=TOOL_POLY}])


add_button("undo",function(){
  cnv0.drawing.splice(cnv0.drawing.length-1,Infinity);
  cnv1.drawing.splice(cnv1.drawing.length-1,Infinity);
});

add_button("clear",function(){
  cnv0.drawing.splice(0,Infinity);
  cnv1.drawing.splice(0,Infinity);
});


document.body.appendChild(document.createElement("br"));

add_input("display scale (px/mm)",function(s){
  SCALE = Number(s);
},"1");


add_input("box (mm)",function(s){
  let [x,y,w,h] = s.split(',').map(x=>Number(x));
  cnv0.Q[0][0] = SCALE*(x);
  cnv0.Q[0][1] = SCALE*(y+h);
  cnv0.Q[1][0] = SCALE*(x+w);
  cnv0.Q[1][1] = SCALE*(y+h);
  cnv0.Q[2][0] = SCALE*(x+w);
  cnv0.Q[2][1] = SCALE*(y);
  cnv0.Q[3][0] = SCALE*(x);
  cnv0.Q[3][1] = SCALE*(y);
  recomp_H();
  cnv0.drawing.splice(0,Infinity);
  sync_canvas();
},"0,0,76.2,50.8");

// add_input("or quad (mm)",function(s){
//   let q = JSON.parse(s);
//   q = q.map(y=>[y[0]*SCALE,y[1]*SCALE]);
//   cnv0.Q.splice(0,Infinity,...q);
//   recomp_H();
//   cnv0.drawing.splice(0,Infinity);
//   sync_canvas();
// },JSON.stringify(cnv0.Q));


let gcode_settings = {
  cutspeed:1,
  plungespeed:1,
  jogheight:2,
  spindlespeed:1000,
  tool:1,
  coolantoff:true,
  formatMm:true,
  unitMinutes:true,
}


// add_button("download gcode",function(){

// })

document.body.appendChild(document.createElement("br"));

let table = document.createElement("table");
table.innerHTML = `<tr><td id="tc0"></td><td id="tc1"></td></tr>`;
document.body.appendChild(table);

add_textarea("gcode setttings", "update", function(elt){
  gcode_settings = JSON.parse(elt.value);
}, JSON.stringify(gcode_settings,null, 2), document.getElementById("tc0"))


add_textarea("gcode", "generate", function(elt){
  console.log(cnv0.drawing)
  let path = cnv0.drawing.map(x=>x.map(y=>[y[0],y[1],0]));
  console.log(path);
  let gcode = path_to_gcode(path,1/SCALE,gcode_settings);
  console.log(gcode);
  elt.value = gcode;
}, "", document.getElementById("tc1"))


document.body.appendChild(document.createElement("br"))
document.body.appendChild(cnv0);
document.body.appendChild(cnv1);