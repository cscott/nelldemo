function randomColor() {
  return Math.floor(Math.random()*4);
}
function Vertex(x,y,color) {
  this.x = x;
  this.y = y;
  this.color = (color===undefined) ? randomColor() : color;
  this.hexes = [];
}
Vertex.prototype = {}
Vertex.prototype.constructor = Vertex;

function Hex(x,y,color) {
  this.x = x;
  this.y = y;
  this.color = (color===undefined) ? randomColor() : color;
  this.vertices = [];
}
Hex.prototype = {}
Hex.prototype.constructor = Hex;

function hex_init() {
  var NROWS = 4;
  var NCOLS = 4;
  var i,j;
  var v = [];
  for (i=0; i<NROWS+1; i++) {
    v[i] = [];
    for (j=0; j<NCOLS*2+4; j++) {
      v[i].push(new Vertex(j, i/*, i%3*/));
    }
  }
  function addV(hex, vtx) {
    hex.vertices.push(vtx);
    vtx.hexes.push(hex);
  }
  var h = [];
  for (i=0; i<NROWS; i++) {
    h[i] = [];
    for (j=0; j<NCOLS; j++) {
      var hh = new Hex(j, i);
      h[i].push(hh);
      // now link up vertices
      var evenRow = (i%2) == 0;
      var evenCol = (j%2) == 0;
      addV(hh, v[i][j*2+2]);
      addV(hh, v[i][j*2+1]);
      if (evenCol) {
	addV(hh, v[i+1][j*2+0]);
      } else {
	addV(hh, v[i][j*2+0]);
      }
      addV(hh, v[i+1][j*2+1]);
      addV(hh, v[i+1][j*2+2]);
      if (evenCol) {
	addV(hh, v[i+1][j*2+3]);
      } else {
	addV(hh, v[i][j*2+3]);
      }
    }
  }
  return [v,h]
}
