function randomColor() {
  return Math.floor(Math.random()*3);
}
function Vertex(x,y,color) {
  this.x = x;
  this.y = y;
  this.color = (color===undefined) ? randomColor() : color;
  this.hexes = [];
}
Vertex.prototype = {}
Vertex.prototype.constructor = Vertex;
Vertex.prototype.clone = function() {
  var v = new Vertex(this.x, this.y, this.color);
  for (var i=0; i<this.hexes.length; i++) {
    v.hexes.push(this.hexes[i]);
  }
  return v;
};

function Hex(x,y,color) {
  this.x = x;
  this.y = y;
  this.color = (color===undefined) ? randomColor() : color;
  this.vertices = [];
}
Hex.prototype = {}
Hex.prototype.constructor = Hex;
Hex.prototype.clone = function() {
  var h = new Hex(this.x, this.y, this.color);
  for (var i=0; i<this.vertices.length; i++) {
    h.vertices.push(this.vertices[i]);
  }
  return h;
};
Hex.prototype.neighbors = function() {
  var n = [ [this.x-1, this.y], [this.x+1, this.y],
            [this.x, this.y-1], [this.x, this.y+1] ];
  // last two neighbors depend on whether this is an odd or even col hex
  if ((this.x % 2)==0) {
    n.push([this.x-1, this.y+1]);
    n.push([this.x+1, this.y+1]);
  } else {
    n.push([this.x-1, this.y-1]);
    n.push([this.x+1, this.y-1]);
  }
  return n;
}

// a World is a 3-4-5-4-3 arrangement of Hexes
// (3 rows, 4 rows, 5 rows)
//
//           2,0
//       1,1     3,1
//   0,1     2,1     4,1
//       1,2     3,2
//   0,2     2,2     4,2
//       1,3     3,3
//   0,3     2,3     4,3
//       1,4     3,4
//           2,4

function World() {
  this.SIZE = 5; // in future, might do larger hexes as well?
  var NROWS = this.SIZE;
  var NCOLS = this.SIZE;
  var i,j;
  var v = [];
  for (i=0; i<NROWS+1; i++) {
    v[i] = [];
    for (j=0; j<NCOLS*2+4; j++) {
      v[i].push(new Vertex(j, i, i%3));
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
      // hackity hack to ensure proper "hex of hexes" shape
      if (i==0 && j!=2) continue;
      if (i==4 && (j==0 || j==4)) continue;
      // ok, this is a good hex, let's set it up.
      var hh = new Hex(j, i, j%3);
      h[i][j]=hh;
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
  // prune unnecessary vertices
  for (i=0; i<v.length; i++) {
    for (j=0; j<v[i].length; j++) {
      if (v[i][j].hexes.length == 0) {
	delete v[i][j];
      }
    }
  }
  this.hexes = h;
  this.vertices = v;
}
World.prototype = {}
World.prototype.constructor = World;
World.prototype.randomHex = function() {
  var all_hexes = [ [0,1], [0,2], [0,3],
		    [1,1], [1,2], [1,3], [1,4],
		    [2,0], [2,1], [2,2], [2,3], [2,4],
		    [3,1], [3,2], [3,3], [3,4],
		    [4,1], [4,2], [4,3] ];
  return function() {
    var which = Math.floor(Math.random() * all_hexes.length);
    var coord = all_hexes[which];
    return this.hexes[coord[1]/*row*/][coord[0]/*col*/];
  };
}();
World.prototype.randomInteriorVertex = function() {
  var h = this.randomHex();
  var vv = []; // this would be a list comprehension in mozilla js, sigh
  for (var k=0; k<h.vertices.length; k++) {
    if (!this.isBorderVertex(h.vertices[k])) {
      vv.push(h.vertices[k]);
    }
  }
  var which = Math.floor(Math.random() * vv.length);
  return vv[which];
};
World.prototype.isBorderHex = function(hex) {
  var n = hex.neighbors();
  for (var k=0; k<6; k++) {
    if (!(this.hexes[n[k][1]] && this.hexes[n[k][1]][n[k][0]])) {
      return true;
    }
  }
  return false;
};
World.prototype.isBorderVertex = function(vertex) {
  return vertex.hexes.length < 3;
};
