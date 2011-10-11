// geometry for hex segments, cores, and edge pieces
var SQRT3 = Math.sqrt(3);

THREE.HexCoreGeometry = function(baseHeight, centerOffset) {
  THREE.Geometry.call(this);
  var v = new THREE.Vector3(1/4, SQRT3/4, baseHeight);
  var m = new THREE.Matrix4();
  var i,j;
  this.vertices.push(new THREE.Vertex(new THREE.Vector3(0,0,
                                      baseHeight + centerOffset)));
  for (i=0; i<6; i++) {
    var vv = m.setRotationZ(i*60*Math.PI/180).multiplyVector3(v.clone());
    this.vertices.push(new THREE.Vertex(vv));
  }
  for (i=0; i<6; i++) {
    var fs = [ 0, 1+i, 1+((1+i)%6) ];
    this.faces.push( new THREE.Face3(fs[0], fs[1], fs[2]) );
    var uvs = [], v;
    for (j=0; j<3; j++) {
      v = this.vertices[fs[j]].position;
      uvs.push(new THREE.UV((v.x+1)/2, (v.y+1)/2));
    }
    this.faceVertexUvs[0/* uv layer 0 */].push(uvs);
  }

  this.computeCentroids();
  this.computeFaceNormals();
};
THREE.HexCoreGeometry.prototype = new THREE.Geometry();
THREE.HexCoreGeometry.prototype.constructor = THREE.HexCoreGeometry;

THREE.HexSegGeometry = function(segRot, uvRot, baseHeight,
                                vertexOffset, centerOffset) {
  THREE.Geometry.call(this);
  var segRotM = new THREE.Matrix4().setRotationZ(segRot*60*Math.PI/180);
  var  uvRotM = new THREE.Matrix4().setRotationZ( uvRot*60*Math.PI/180);
  var i, j;

  var pts = [ [1/4,SQRT3/4,centerOffset],
              [3/8,SQRT3/8,centerOffset],
              [3/4,SQRT3/4,0],
              [1/2,SQRT3/2,vertexOffset],
              [  0,SQRT3/2,0],
              [  0,SQRT3/4,centerOffset] ];

  for (i=0; i<pts.length; i++) {
    this.vertices.push(new THREE.Vertex(segRotM.multiplyVector3(
                                        new THREE.Vector3(pts[i][0], pts[i][1],
                                                     baseHeight + pts[i][2]))));
  }

  var fs = [ [ 0, 1, 2 ],
             [ 0, 2, 3 ],
             [ 0, 3, 4 ],
             [ 0, 4, 5 ] ];
  for (i=0; i<fs.length; i++) {
    this.faces.push( new THREE.Face3(fs[i][0], fs[i][1], fs[i][2]) );
    var uvs = [], v, p;
    for (j=0; j<3; j++) {
      p = pts[fs[i][j]];
      v = uvRotM.multiplyVector3(new THREE.Vector3(p[0], p[1], p[2]));
      uvs.push(new THREE.UV((v.x+1)/2, (v.y+1)/2));
    }
    this.faceVertexUvs[0/* uv layer 0 */].push(uvs);
  }

  this.computeCentroids();
  this.computeFaceNormals();
};
THREE.HexSegGeometry.prototype = new THREE.Geometry();
THREE.HexSegGeometry.prototype.constructor = THREE.HexSegGeometry;

THREE.HexEdgeGeometry = function(baseHeight, vertexOffsets, mirrorUV) {
  THREE.Geometry.call(this);
  var UV_HEIGHT_SCALE = 1/3;
  var UV_CIRCUM_SCALE = 2;
  var v1 = new THREE.Vector3(1/2, SQRT3/2, baseHeight);
        var v2 = new THREE.Vector3(0, SQRT3/2, baseHeight);
  var m = new THREE.Matrix4();
  var i, vv1, vv2;
  var uvs = [];
  // vertices
  for (i=0; i<7; i++) {
    var vv1a, vv1b, vv2a, vv2b;
    m.setRotationZ(i*60*Math.PI/180);
    vv1a = m.multiplyVector3(v1.clone());
    vv2a = m.multiplyVector3(v2.clone());
    vv1b = vv1a.clone();
    vv2b = vv2a.clone();
    vv1a.z += vertexOffsets[i%6];
    vv1b.z = vv2b.z = 0;
    if (i<6) {
      this.vertices.push(new THREE.Vertex(vv1a));
      this.vertices.push(new THREE.Vertex(vv1b));
      this.vertices.push(new THREE.Vertex(vv2a));
      this.vertices.push(new THREE.Vertex(vv2b));
    }
    uvs.push(new THREE.UV((2*i)/12, baseHeight + vertexOffsets[i%6]));
    uvs.push(new THREE.UV((2*i)/12, 0));
    uvs.push(new THREE.UV((2*i+1)/12, baseHeight));
    uvs.push(new THREE.UV((2*i+1)/12, 0));
  }
  // scaling
  for (i=0; i<uvs.length; i++) {
                uvs[i].u *= UV_CIRCUM_SCALE;
    uvs[i].v *= UV_HEIGHT_SCALE;
                if (mirrorUV) { uvs[i].u = 16/12 - uvs[i].u; }
  }
  // faces
  for (i=0; i<6; i++) {
    var j = i*4;
    this.faces.push(new THREE.Face4(j+0, j+1, j+3, j+2));
    this.faces.push(new THREE.Face4(j+2, j+3, (j+5)%24, (j+4)%24));
    this.faceVertexUvs[0].push([uvs[j+0], uvs[j+1], uvs[j+3], uvs[j+2]]);
    this.faceVertexUvs[0].push([uvs[j+2], uvs[j+3], uvs[j+5], uvs[j+4]]);
  }

  this.computeCentroids();
  this.computeFaceNormals();
  // this makes the edges bright for debugging
/*
  for (i=0; i<this.faces.length; i++) {
    this.faces[i].normal.negate();
  }
*/
};
THREE.HexEdgeGeometry.prototype = new THREE.Geometry();
THREE.HexEdgeGeometry.prototype.constructor = THREE.HexEdgeGeometry;
