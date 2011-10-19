var FOG_COLOR = 0xBFD1E5; // 0xEFD1B5
var REALTIME_SPEEDUP = 24*60; // 1 day = 1 minute, for day/night cycle

//if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
var SCREEN_ASPECT_RATIO = 4/3;
var container = document.body;

var daytime = .23; // [0-1) where 0=midnight, 0.5=noon
var mouse = { x:0, y:0 };
var projector = new THREE.Projector();

function init_renderer(container) {
  var renderer = new THREE.WebGLRenderer();
  renderer.autoClear = false; // for shadowmap (two passes)
  renderer.domElement.style.position = "relative";
  container.appendChild(renderer.domElement);
  return renderer;
}

function init_scene(renderer) {
  var scene = new THREE.Scene();
  if (RENDER_FOG) {
    //scene.fog = new THREE.FogExp2( FOG_COLOR, 0.035 );
    scene.fog = new THREE.Fog( FOG_COLOR, 1, 40 );
    renderer.setClearColor( scene.fog.color, 1 );
  }
  return scene;
}

function init_camera(scene) {
  var camera = new THREE.PerspectiveCamera(26, SCREEN_ASPECT_RATIO,
                                           0.01, 2000);
  camera.position.z = 10;
  camera.position.y = -10;
  camera.lookAt(new THREE.Vector3(0,0,0));
  scene.camera = camera;
}

function init_lights(scene) {
  var ambientLight = new THREE.AmbientLight( 0x404040 );
  scene.add( ambientLight );

  var spotLight = new THREE.SpotLight(0xFFFFFF);
  spotLight.position.set( 15, 15, 4 );
  spotLight.position.normalize().multiplyScalar(22);
  spotLight.target.position.set( 0, 0, 0 );
  spotLight.castShadow = true;
  scene.add( spotLight );

  // This is JavaScript: add these as properties of the scene
  scene.ambientLight = ambientLight;
  scene.spotLight = spotLight;
}

function init_stats(container) {
  var stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  stats.domElement.style.right = '0px';
  stats.domElement.style.zIndex = 100;
  container.appendChild( stats.domElement );
  return stats;
}

function init_controls(scene) {
  var controls = new THREE.TrackballControls( scene.camera );
  controls.rotateSpeed = 3.0;
  controls.zoomSpeed = 5;
  controls.panSpeed = 0.8;

  controls.noZoom = false;
  controls.noPan = false;

  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;

  controls.keys = [ 65, 83, 68 ];
  return controls;
}

var renderer = init_renderer(container);
var scene = init_scene(renderer);
init_camera(scene);
init_lights(scene);
var stats = init_stats(container);
var controls = init_controls(scene);


function init_ground(scene) {
  var waterTexture = THREE.ImageUtils.loadTexture(
    'textures/water-texture-128.png' );
  waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
  waterTexture.repeat.set(40,40);
  var waterMaterial = new THREE.MeshLambertMaterial({map:waterTexture});

  var ground = new THREE.Mesh(new THREE.PlaneGeometry(100,100), waterMaterial);
  ground.position.z = WorldConst.BASE_HEIGHT + WorldConst.WATER_OFFSET;
  scene.add(ground);
  return ground;
}
var ground = init_ground(scene);

// initialize the hexes and start drawin' 'em!
var world = new World();

// make borders of world all ocean
(function () {
  for (var i=0; i<world.vertices.length; i++) {
    for (var j=0; j<world.vertices[i].length; j++) {
      var v = world.vertices[i][j];
      if (!v) continue;
      if (world.isBorderVertex(v)) {
	v.color = WorldConst.COLOR_WATER; /* ocean */
      }
    }
  }
})();

var worldobj = new WorldObject(world);
scene.add(worldobj);

var flipState = null;
var flippingHexes = null;
var doppelHexes = null;
var flippingNeighbors = null;
function flipHex() {
  var i, j, k, s, q;
  if (flipState == null) {
     flipState = { startTime: Date.now() };
     if (Math.random() < 0.5) {
       // change a vertex color
       var v = world.randomInteriorVertex();
       var nv = v.clone();
       nv.color = randomColor();
       flipState.hexes = v.hexes;
       flipState.doppel = [];
       flipState.axes = [];
       for (i=0; i<flipState.hexes.length; i++) {
         flipState.doppel.push(flipState.hexes[i].clone());
         var which = flipState.hexes[i].vertices.indexOf(v);
         flipState.doppel[i].vertices[which] = nv;
         var m = new THREE.Matrix4().setRotationZ((which*60-30)*Math.PI/180);
         var axis = m.multiplyVector3(new THREE.Vector3(1,0,0));
         flipState.axes.push(axis);
       }
     } else {
       // change a core color
       flipState.hexes = [ world.randomHex() ];
       flipState.doppel = [ flipState.hexes[0].clone() ];
       flipState.doppel[0].color = randomColor();
       // pick axis at random, but quantize
       var angle = Math.floor(Math.random()*12) * 30 * Math.PI/180;
       var m = new THREE.Matrix4().setRotationZ(angle);
       var axis = m.multiplyVector3(new THREE.Vector3(1,0,0));
       flipState.axes = [ axis ];
     }

     if (flipState.hexes.length==0) {
       flipState = null;
       return; // pick another one later
     }

     // add edges, backs, find neighbors
     flipState.neighbors = [];
     for (i=0; i<flipState.hexes.length; i++) {
       // add edges
       worldobj.updateHex(world, flipState.hexes[i], true/*add edges*/);
       // make a doppelganger
       worldobj.updateHex(world, flipState.doppel[i], true/*add edges*/);
       // find all neighbors
       var n = flipState.hexes[i].neighbors();
       for (j=0; j<n.length; j++) {
         if (!world.hexes[n[j][1]]) { continue; }
         var nn = world.hexes[n[j][1]][n[j][0]];
         if (!nn) { continue; }
         flipState.neighbors.push(nn);
       }
     }
     // filter out redundant neighbors
     seen = {}
     function mkKey(hex) { return hex.x+","+hex.y; }
     for (i=0; i<flipState.hexes.length; i++) {
       seen[mkKey(flipState.hexes[i])] = 1;
     }
     var nn = [];
     for (i=0; i<flipState.neighbors.length; i++) {
       if (seen[mkKey(flipState.neighbors[i])]) { continue; }
       seen[mkKey(flipState.neighbors[i])] = 1;
       nn.push(flipState.neighbors[i]);
     }
     flipState.neighbors = nn;
     // add edges to neighbors
     for (i=0; i<flipState.neighbors.length; i++) {
       worldobj.updateHex(world, flipState.neighbors[i], true);
     }
  }
  // 0.25 degree per millisecond.
  var rotationAmt = (Date.now() - flipState.startTime) * 0.4 * Math.PI/180;
  for (i=0; i<flipState.hexes.length; i++) {
    q = new THREE.Quaternion().setFromAxisAngle(flipState.axes[i],-rotationAmt);
    for (j=0; j<flipState.hexes[i].objs.length; j++) {
      flipState.hexes[i].objs[j].quaternion = q;
      flipState.hexes[i].objs[j].useQuaternion = true;
    }
    q = new THREE.Quaternion().setFromAxisAngle(flipState.axes[i], -rotationAmt
                                                                   + Math.PI);
    for (j=0; j<flipState.doppel[i].objs.length; j++) {
      flipState.doppel[i].objs[j].quaternion = q;
      flipState.doppel[i].objs[j].useQuaternion = true;
    }
  }

  if (rotationAmt > Math.PI) {
    // fully rotated
    for (i=0; i<flipState.hexes.length; i++) {
      var h = flipState.hexes[i], d = flipState.doppel[i];
      // update all colors
      h.color = d.color;
      for (j=0; j<h.vertices.length; j++) {
        h.vertices[j].color = d.vertices[j].color;
      }
      worldobj.updateHex(world, h); // resets rotation, color, etc
      for (j=0; j<d.objs.length; j++) {
        scene.remove(d.objs[j]);
      }
    }
    for (i=0; i<flipState.neighbors.length; i++) {
      worldobj.updateHex(world, flipState.neighbors[i]);
    }
    flipState = null;
  }
}

function init_shadows(renderer) {
  // adjust shadowCameraNear to make depth scaling work right for shadowMap
  renderer.shadowCameraNear = 0.001;
  renderer.shadowCameraFar = scene.camera.far;
  // "uncomment to see light frustum boundaries" in WebGLShaders.js
  // in order to adjust this
  renderer.shadowCameraFov = 50;
  // give better shadows at around 10:00 (shadows which don't detach from
  // the mountains) by tweaking up the shadowMapBias *very* slightly
  renderer.shadowMapBias = 0.003905;
  //renderer.shadowMapDarkness = 0.5;
  renderer.shadowMapWidth = SHADOW_MAP_SIZE;
  renderer.shadowMapHeight = SHADOW_MAP_SIZE;

  renderer.shadowMapEnabled = true;
  renderer.shadowMapSoft = true;
}
function init_shadow_hud(renderer, scene) {
  // add a test item to the scene
  var planeMaterial = new THREE.MeshLambertMaterial( { color: 0xffdd99 } );
  var mtest = new THREE.Mesh(new THREE.CubeGeometry(1,1,1), planeMaterial);
  mtest.position.z = 1;
  mtest.castShadow = true;
  scene.add(mtest);

  // show shadow map
  // (borrowed from webgl_shadowmap.html demo; don't expect me to understand
  //  how this works!)
  // XXX: this should resize onWindowResize, but I'm lazy.
  var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
  var cameraOrtho = new THREE.OrthographicCamera(
    SCREEN_WIDTH / - 2, SCREEN_WIDTH / 2,
    SCREEN_HEIGHT / 2, SCREEN_HEIGHT / - 2, -10, 1000 );
  cameraOrtho.position.z = 10;

  var shader = THREE.ShaderExtras[ "screen" ];
  var uniforms = new THREE.UniformsUtils.clone( shader.uniforms );

  var hudMaterial = new THREE.ShaderMaterial( {
    vertexShader: shader.vertexShader, fragmentShader: shader.fragmentShader,
    uniforms: uniforms } );

  var hudGeo = new THREE.PlaneGeometry(
    SHADOW_MAP_SIZE / 2, SHADOW_MAP_SIZE / 2 );
  var hudMesh = new THREE.Mesh( hudGeo, hudMaterial );
  hudMesh.position.x = ( SCREEN_WIDTH - SHADOW_MAP_SIZE / 2 ) * -0.5;
  hudMesh.position.y = ( SCREEN_HEIGHT - SHADOW_MAP_SIZE / 2 ) * -0.5;

  var sceneHUD = new THREE.Scene();
  sceneHUD.add( hudMesh );

  cameraOrtho.lookAt( sceneHUD.position );
  return { hudMaterial: hudMaterial,
	   sceneHUD: sceneHUD,
	   cameraOrtho: cameraOrtho };
}

var shadow;
if (RENDER_SHADOWS) {
  init_shadows(renderer);
  if (DEBUG_SHADOW_MAP) {
    shadow = init_shadow_hud(renderer, scene);
  }
}

function onDocumentMouseMove( event ) {
  event.preventDefault();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
};

function onWindowResize( event ) {
  // force aspect ratio to 4:3 for accurate reflection of Nell demo
  var w = window.innerWidth, h = window.innerHeight;
  if (w > h*SCREEN_ASPECT_RATIO) {
    w = Math.round(h*SCREEN_ASPECT_RATIO);
  } else if (w < h*SCREEN_ASPECT_RATIO) {
    h = Math.round(w/SCREEN_ASPECT_RATIO);
  }

  renderer.setSize( w, h );
  // center the element, for nice letter boxing.
  renderer.domElement.style.left=Math.floor((window.innerWidth-w)/2)+"px";
  renderer.domElement.style.top=Math.floor((window.innerHeight-h)/2)+"px";

  /* not needed, since we're using a fixed aspect ratio now */
  if (false) {
    scene.camera.aspect = w/h;
    scene.camera.updateProjectionMatrix();
  }
}


function animate() {
  requestAnimationFrame( animate );

  var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
  projector.unprojectVector( vector, scene.camera );
  var ray = new THREE.Ray( scene.camera.position, vector.subSelf( scene.camera.position ).normalize() );

  render();
  stats.update();
}

function clamp( x, a, b ) { return x < a ? a : ( x > b ? b : x ); }

function map_linear( x, sa, sb, ea, eb ) {
  return ( x  - sa ) * ( eb - ea ) / ( sb - sa ) + ea;
};

function update_time_of_day(renderer, scene, daytime) {
  var v = clamp(0.5-Math.cos(daytime*2*Math.PI)*1.8, 0.1, 0.95);
  var v2 = 0.5 * (1-clamp(-Math.cos(daytime*2*Math.PI), 0, 1));
  var skyColor = new THREE.Color().setHSV( 0.51, v2, v );
  if (RENDER_FOG) { scene.fog.color = skyColor; }
  renderer.setClearColor( skyColor, 1 );

  if (FIXED_TIME != null) daytime = FIXED_TIME;
  var cues = [
   //time sun angle intensity, r,   g,   b,  ambient,  shadow
   [0/24,  90,       0.55,    0.2, 0.2, 1.0, 0.07,     0.5],
   [2/24,  85,       0.5,     0.2, 0.2, 1.0, 0.07,     0.5],
   [5.5/24, 0,       0.0,     0.2, 0.2, 0.2, 0.10,     0.0],
   [6/24,   0,       0.0,     1.0, 0.0, 0.0, 0.10,     0.5],
   [6.5/24, 4,       1.20,    1.0, 0.0, 0.0, 0.08,     0.8],
   [7/24,  10,       1.75,    1.0, 0.0, 0.0, 0.07,     0.8],
   [8/24,  30,       1.0,     1.0, 0.4, 0.4, 0.20,     0.8],
   [10/24, 90,       1.0,     0.8, 0.8, 0.8, 0.33,     1.0],
   [12/24, 90,       1.2,     1.0, 1.0, 0.4, 0.33,     1.0],
   [14/24, 90,       1.0,     0.8, 0.8, 0.8, 0.33,     1.0],
   [16/24,150,       1.0,     1.0, 0.5, 0.5, 0.30,     0.8],
   [17/24,170,       1.75,    1.0, 0.0, 0.0, 0.07,     0.8],
   [17.5/24,176,     1.20,    1.0, 0.0, 0.0, 0.08,     0.8],
   [18/24,180,       0.0,     1.0, 0.0, 0.0, 0.10,     0.5],
   [18.5/24,180,     0.0,     0.2, 0.2, 0.2, 0.10,     0.0],
   [22/24,105,       0.5,     0.2, 0.2, 1.0, 0.07,     0.5],
   [24/24, 90,       0.55,    0.2, 0.2, 1.0, 0.07,     0.5] ];

  // find the right two entries in the cue sheet
  for (var i=1; i<cues.length; i++) {
   if (cues[i][0] >= daytime) break;
  }
  var sunAngle = map_linear(daytime,
                            cues[i-1][0], cues[i][0],
                            cues[i-1][1], cues[i][1]);
  sunAngle = -sunAngle*Math.PI/180;
  scene.spotLight.intensity = map_linear(daytime,
					 cues[i-1][0], cues[i][0],
					 cues[i-1][2], cues[i][2]);
  scene.spotLight.color.setRGB(map_linear(daytime,
					  cues[i-1][0], cues[i][0],
					  cues[i-1][3], cues[i][3]),
                               map_linear(daytime,
					  cues[i-1][0], cues[i][0],
					  cues[i-1][4], cues[i][4]),
                               map_linear(daytime,
					  cues[i-1][0], cues[i][0],
					  cues[i-1][5], cues[i][5]));
  var m = new THREE.Matrix4().setRotationAxis(new THREE.Vector3(-1,1,0), sunAngle);
  scene.spotLight.position.set( 15, 15, 0 );
  m.multiplyVector3(scene.spotLight.position);

  scene.ambientLight.color.setHSV( 0, 0, map_linear(daytime,
						    cues[i-1][0], cues[i][0],
						    cues[i-1][6], cues[i][6]));

  var dark = map_linear(daytime, cues[i-1][0], cues[i][0],
                                 cues[i-1][7], cues[i][7]);
  renderer.shadowMapDarkness = dark;
}

var lastFrameTime = Date.now();
var FIXED_TIME=null;
function render() {
  var elapsed = Date.now() - lastFrameTime;
  lastFrameTime += elapsed;

  // move camera
  if (controls) controls.update();
  // animate terrain mutation
  flipHex();
  // day/night cycle
  daytime += elapsed*REALTIME_SPEEDUP/(1000*60*60*24);
  if (daytime >= 1) { daytime -= Math.floor(daytime); }
  update_time_of_day(renderer, scene, daytime);

  renderer.clear();
  renderer.render( scene, scene.camera );

  if (RENDER_SHADOWS && DEBUG_SHADOW_MAP) {
    // debug shadow map
    shadow.hudMaterial.uniforms.tDiffuse.texture = renderer.shadowMap[ 0 ];
    renderer.render( shadow.sceneHUD, shadow.cameraOrtho);
  }

}
container.addEventListener( 'mousemove', onDocumentMouseMove, false );
window.addEventListener( 'resize', onWindowResize, false );
onWindowResize();
animate();
