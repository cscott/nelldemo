// RENDER_SMOOTH escapes this module.

/* Constants */
var WorldConst = {
  /* Enumeration of terrain types. */
  COLOR_MOUNTAIN: 0,
  COLOR_GRASS: 1,
  COLOR_WATER: 2,

  /* Geometry parameters. */
  BASE_HEIGHT: .15,
  WATER_OFFSET: -.1,
  GRASS_OFFSET: 0,
  MOUNTAIN_OFFSET: .25
};

// A = mountain, B = grass, C = sea
WorldConst.COLOR_OFFSET = [
  /*COLOR_MOUNTAIN:*/ WorldConst.MOUNTAIN_OFFSET,
  /*COLOR_GRASS:   */ WorldConst.GRASS_OFFSET,
  /*COLOR_WATER:   */ WorldConst.WATER_OFFSET ];

// Texture information.
// 0 -> mountain->grass
// 1 -> grass->grass
// 2 -> grass->water
// 3 -> water->water
// 4 -> water->mountain
// 5 -> mountain->mountain
WorldConst.COLOR_TABLE = [
  /* mountain */ [  [5,false], [0,false], [4,true ] ],
  /* grass */    [  [0,true ], [1,false], [2,false] ],
  /* water */    [  [4,false], [2,true ], [3,false] ] ];

function WorldTextures() {
  var tileMaterials = [];
  // in order: mountain, grass, sea
  var tileTextureNames = [ '2c', '2a', '2b' ];
  var i;
  for (i=0; i<tileTextureNames.length; i++) {
    var matprops = {
      map: THREE.ImageUtils.loadTexture('textures/tile-draft-' +
					tileTextureNames[i] + '-128.png'),
      color: 0xFFFFFF
    };
    if (RENDER_SMOOTH) {
      matprops.shading = THREE.SmoothShading;
      tileMaterials.push(new THREE.MeshLambertMaterial(matprops));
    } else {
      tileMaterials.push(new THREE.MeshBasicMaterial(matprops));
    }
  }
  var edgeTexture = THREE.ImageUtils.loadTexture( 'textures/acorns.jpg');
  //var edgeTexture = THREE.ImageUtils.loadTexture( 'textures/UV.jpg' );
  edgeTexture.wrapS = edgeTexture.wrapT = THREE.RepeatWrapping;
  var edgeMaterial = new THREE.MeshLambertMaterial({map:edgeTexture});

  // icon texture
  var appTexture = THREE.ImageUtils.loadTexture("textures/tomas_arad_home.png");

  // assign to properties.
  this.tileMaterials = tileMaterials;
  this.edgeMaterial = edgeMaterial;
}
WorldTextures.prototype = {}
WorldTextures.constructor = WorldTextures;

function UVavg(uv1, uv2) {
  return new THREE.UV((uv1.u + uv2.u) / 2,
                      (uv1.v + uv2.v) / 2);
}

function subdivideGeometry(g) {
  var newf = [], newuv = [];
  var i;
  for (i=0; i<g.faces.length; i++) {
    var face = g.faces[i], uv = g.faceVertexUvs[0][i];
    //console.assert(face instanceof THREE.Face3);
    // split each edge
    var a = g.vertices[face.a].position;
    var b = g.vertices[face.b].position;
    var c = g.vertices[face.c].position;
    var ab = a.clone().addSelf(b).divideScalar(2);
    var bc = b.clone().addSelf(c).divideScalar(2);
    var ca = c.clone().addSelf(a).divideScalar(2);

    var _ab = g.vertices.length;
    g.vertices.push(new THREE.Vertex(ab));
    var _bc = g.vertices.length;
    g.vertices.push(new THREE.Vertex(bc));
    var _ca = g.vertices.length;
    g.vertices.push(new THREE.Vertex(ca));

    var uv_ab = UVavg(uv[0], uv[1]);
    var uv_bc = UVavg(uv[1], uv[2]);
    var uv_ca = UVavg(uv[2], uv[0]);

    newf.push(new THREE.Face3(_ca, face.a, _ab));
    newuv.push             ([uv_ca, uv[0], uv_ab]);
    newf.push(new THREE.Face3(_ab, face.b, _bc));
    newuv.push             ([uv_ab, uv[1], uv_bc]);
    newf.push(new THREE.Face3(_bc, face.c, _ca));
    newuv.push             ([uv_bc, uv[2], uv_ca]);
    newf.push(new THREE.Face3(_ab, _bc, _ca));
    newuv.push             ([uv_ab, uv_bc, uv_ca]);
  }
  g.faces = newf;
  g.faceVertexUvs[0] = newuv;
  g.computeCentroids();
  g.computeFaceNormals();
}

function _updateHex(parent, world, h, addEdges) {
    var i, k, s, n;
    if (h.objs && h.objs.length) {
      for (i=0; i<h.objs.length; i++) {
        parent.remove(h.objs[i]);
      }
    }
    h.objs = [];

    var xoff = (h.x-world.CENTER_HEX_X)*1.5;
    var yoff = (h.y-world.CENTER_HEX_Y)*-SQRT3;
    if ((h.x%2)==1) { yoff += SQRT3/2; }

    var g = null, gg;
    for (k=0; k<6; k++) {
      var v1 = h.vertices[(k)%6], v2 = h.vertices[(k+1)%6];
      var uvRot = WorldConst.COLOR_TABLE[v1.color][v2.color];
      gg = new THREE.HexSegGeometry(k+1, uvRot[0], uvRot[1],
				    WorldConst.BASE_HEIGHT,
                                    WorldConst.COLOR_OFFSET[v1.color],
                                    WorldConst.COLOR_OFFSET[v2.color], 0);
      if (g) { THREE.GeometryUtils.merge(g, gg); }
      else { g = gg; }
    }
    gg = new THREE.HexCoreGeometry(WorldConst.BASE_HEIGHT,
				   WorldConst.COLOR_OFFSET[h.color]);
    if (RENDER_SMOOTH) subdivideGeometry(gg);
    THREE.GeometryUtils.merge(g, gg);

    // smooth rendering by computing appropriate vertex normals.
    g.mergeVertices();
    if (RENDER_SMOOTH) {
      g.computeVertexNormals();

      // further hack to smooth tile boundaries
      function isOuterVertex(g, vidx) {
        var v = g.vertices[vidx];
        // midpoint of edges are 0.86 from center.  squared, that's 0.75
        return (v.position.x * v.position.x)+(v.position.y*v.position.y) > 0.74;
      }
      for (i=0; i<g.faces.length; i++) {
        var face = g.faces[i];
        //console.assert(face instanceof THREE.Face3);
        if (isOuterVertex(g, face.a)) { face.vertexNormals[0].set(0,0,1); }
        if (isOuterVertex(g, face.b)) { face.vertexNormals[1].set(0,0,1); }
        if (isOuterVertex(g, face.c)) { face.vertexNormals[2].set(0,0,1); }
      }
    }

    s = new THREE.Mesh(g, parent.textures.tileMaterials[h.color]);
    s.position.x = xoff;
    s.position.y = yoff;
    s.castShadow = true;
    s.receiveShadow = true;
    h.objs.push(s);
    parent.add(s);

    // always add edges if this is a boundary hex.
    if (world.isBorderHex(h)) {
      addEdges = true;
    }

    // app icon
    /*
    var sprite = new THREE.Sprite(
      { map: appTexture, useScreenCoordinates: false, color: 0xffffff,
        alignment: THREE.SpriteAlignment.bottomCenter });
    sprite.position.set( xoff, yoff, BASE_HEIGHT+COLOR_OFFSET[h.color]);
    sprite.scale.set(1/128,1/128,1/128);
    h.objs.push(sprite);
    parent.add(sprite);
    */

    if (!addEdges) return;

    var avo = [];
    for (k=0; k<6; k++) {
      var v = h.vertices[k];
      avo.push(WorldConst.COLOR_OFFSET[v.color]);
    }
    s = new THREE.Mesh(new THREE.HexEdgeGeometry(WorldConst.BASE_HEIGHT, avo),
                       parent.textures.edgeMaterial);
    s.position.x = xoff;
    s.position.y = yoff;
    h.objs.push(s);
    parent.add(s);
}

function WorldObject(world) {
  // superclass constructor
  THREE.Object3D.call( this );

  for (var i=0; i<world.hexes.length; i++) {
    for (var j=0; j<world.hexes[i].length; j++) {
      if (world.hexes[i][j]) {
	this.updateHex(world, world.hexes[i][j], false);
      }
    }
  }
}

WorldObject.prototype = new THREE.Object3D();
WorldObject.prototype.constructor = WorldObject;
WorldObject.prototype.supr = THREE.Object3D.prototype;
WorldObject.prototype.textures = new WorldTextures();
WorldObject.prototype.updateHex = function(world, hex, addEdges) {
  _updateHex(this, world, hex, addEdges);
};
