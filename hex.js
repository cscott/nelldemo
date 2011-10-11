// geometry for hex segments, cores, and edge pieces
var SQRT3 = Math.sqrt(3);

THREE.HexCoreGeometry = function(centerOffset, edgeOffset) {
  THREE.Geometry.call(this);
  var v = new THREE.Vector3(1/4,SQRT3/4,edgeOffset);
  var m = new THREE.Matrix4();
  var i;
  this.vertices.push(new THREE.Vertex(new THREE.Vector3(0,0,centerOffset)));
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
  console.log(this);
};
THREE.HexCoreGeometry.prototype = new THREE.Geometry();
THREE.HexCoreGeometry.prototype.contructor = THREE.HexCoreGeometry;

THREE.HexSegGeometry = function(segRot, uvRot, vertexOffset, centerOffset) {
  var i, j;
  THREE.Geometry.call(this);
  var segRotM = new THREE.Matrix4().setRotationZ(segRot*60*Math.PI/180);
  var  uvRotM = new THREE.Matrix4().setRotationZ( uvRot*60*Math.PI/180);

  var pts = [ [1/4,SQRT3/4,centerOffset],
              [3/8,SQRT3/8,centerOffset],
              [3/4,SQRT3/4,0],
              [1/2,SQRT3/2,vertexOffset],
              [  0,SQRT3/2,0],
              [  0,SQRT3/4,centerOffset] ];

  for (i=0; i<pts.length; i++) {
    this.vertices.push(new THREE.Vertex(segRotM.multiplyVector3(
                                        new THREE.Vector3
                                        (pts[i][0], pts[i][1], pts[i][2]))));
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
THREE.HexSegGeometry.prototype.contructor = THREE.HexSegGeometry;
