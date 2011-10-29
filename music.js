var SCREEN_ASPECT_RATIO = 4/3;
var SHADOW_MAP_SIZE = 512;
var DEBUG_SHADOW_MAP = false;

var size = 10, xres = 32, yres = 16;
var buffer1 = [], buffer2 = [], temp;
var grid = [], plane;
var scene, camera, light, renderer;
var geometry, material;
var mouse, projector, ray, intersects = [];
var stats;
var controls;
var shadow;

var audioDev;
var ks=[];

function init() {

    var container = document.body;

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    for ( var x = 0 ; x < xres ; x++ ) {
	buffer1[x] = [];
	buffer2[x] = [];
	for ( var y = 0; y < yres ; y++) {
	    buffer1[x][y] = 0;
	    buffer2[x][y] = 0;
	}
    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 50, SCREEN_ASPECT_RATIO, 1, 2000 );
    camera.position.x = 0;
    camera.position.y = size*-10.5;
    camera.position.z = size*22;
    camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
    scene.add( camera );

    scene.add( new THREE.AmbientLight( 0x808080 ) );

    light = new THREE.SpotLight( 0xffffff, 1.25 );
    light.position.set( -size*24, size*10, size*18 );
    light.target.position.set( 0, 0, 0 );
    light.castShadow = true;
    scene.add( light );

    geometry = new THREE.HexPrismGeometry( size/2, size );
    geometry.applyMatrix( new THREE.Matrix4().setTranslation( 0, 0, size/2 ) );
    material = new THREE.MeshLambertMaterial( { color: 0xd0d0d0 } );


    for ( var x = 0 ; x < xres ; x++ ) {
      grid[x] = [];
      for ( var y = 0; y < yres ; y++) {
	cube = new THREE.Mesh( geometry, material );
	cube.position.x = (x-xres/2) * size * 3 / 4;
	cube.position.y = (y-yres/2) * size * SQRT3 / 2;
        if ((x % 2) == 1) {
	  cube.position.y += size * SQRT3 / 4;
        }

	cube.castShadow = true;
	cube.receiveShadow = true;
	scene.add( cube );

	grid[x][y] = cube;
      }
    }

    geometry = new THREE.PlaneGeometry( size*xres, size*yres );

    plane = new THREE.Mesh( geometry, material );
    //plane.position.z = size;
    plane.visible = false;
    scene.add( plane );

    renderer = new THREE.WebGLRenderer();
    renderer.autoClear = false; // for shadowmap
    renderer.setClearColorHex(0xBFD1E5);

    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;

    renderer.shadowCameraNear = 0.5;
    renderer.shadowCameraFar = 2500;
    renderer.shadowCameraFov = 50;

    renderer.shadowMapBias = 0.00387;
    renderer.shadowMapDarkness = 0.5;
    renderer.shadowMapWidth = SHADOW_MAP_SIZE;
    renderer.shadowMapHeight = SHADOW_MAP_SIZE;

    container.appendChild( renderer.domElement );
    renderer.domElement.style.position = "absolute";

    controls = new THREE.TrackballControls(camera, renderer.domElement);

    mouse = new THREE.Vector3( 0, 0, 1 );
    projector = new THREE.Projector();
    ray = new THREE.Ray( camera.position );

    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );

}

function onDocumentMouseMove( event ) {
    var c = renderer.domElement;

    mouse.x = ( event.offsetX / c.width ) * 2 - 1;
    mouse.y = - ( event.offsetY / c.height ) * 2 + 1;

    ray.direction = projector.unprojectVector( mouse.clone(), camera );
    ray.direction.subSelf( camera.position ).normalize();

    intersects = ray.intersectObject( plane );
}

function animate() {

    requestAnimationFrame( animate );

    render();
    stats.update();

}

function render() {
    controls.update();

    if ( intersects.length ) {

      var point = intersects[ 0 ].point;
      var x = Math.round((xres/2) + (point.x / (size*3/4) ));
      var y = 0;
      if ((x % 2) == 1) {
	y = size * SQRT3 / 4;
      }
      var y = Math.round((yres/2) + ((point.y-y) / (size*SQRT3/2) ));

      if (x >= 0 && x < xres &&
	  y >= 0 && y < yres ) {

	buffer1[x][y] = 10;
	playNote(x, y);
      }
    }

    // update buffers
    for (var x = 0; x < xres; x++) {
      for (var y = 0; y < yres; y++) {

	var x1, x2, y1, y2;

	if ( x == 0 ) {

	    // left edge

	    x1 = 0;
	    x2 = buffer1[ x + 1 ][ y ];

	} else if ( x == xres - 1 ) {

	    // right edge

	    x1 = buffer1[ x - 1 ][ y ];
	    x2 = 0;

	} else {

	    x1 = buffer1[ x - 1 ][ y ];
	    x2 = buffer1[ x + 1 ][ y ];

	}

	if ( y == 0 ) {

	    // top edge

	    y1 = 0;
	    y2 = buffer1[ x ][ y+1 ];

	} else if ( y == yres - 1 ) {

	    // bottom edge

	    y1 = buffer1[ x ][ y-1 ];
	    y2 = 0;

	} else {

	    y1 = buffer1[ x ][ y - 1 ];
	    y2 = buffer1[ x ][ y + 1 ];

	}

	buffer2[x][y] = ( x1 + x2 + y1 + y2 ) / 1.9 - buffer2[x][y];
	buffer2[x][y] -= buffer2[x][y] / 10;
      }
    }

    temp = buffer1;
    buffer1 = buffer2;
    buffer2 = temp;

    // update grid

    for (var x = 0; x < xres; x++) {
      for (var y = 0; y < yres; y++) {
	grid[x][y].scale.z += ( Math.max( 0.1, 0.1 + buffer2[x][y] ) - grid[x][y].scale.z ) * 0.1;
      }
    }

    renderer.clear();
    renderer.render( scene, camera );
    if (DEBUG_SHADOW_MAP) {
      shadow.hudMaterial.uniforms.tDiffuse.texture = renderer.shadowMap[ 0 ];
      renderer.render( shadow.sceneHUD, shadow.cameraOrtho);
    }
}

function init_shadow_hud(renderer, scene) {
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
if (DEBUG_SHADOW_MAP) {
  shadow = init_shadow_hud(renderer, scene);
}

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
}

var frequencies = [];
function initFrequencies() {
  var pentatonic = [ 0, // D
		     2, // E
		     4, // F#
		     7, // A
		     9, // B
		     12];
  var BASE = 440; // A4
  var OFFSET = -19; // D3 (19 semitones below A)
  var y,i,octave;
  for (y=0,octave=0; y<yres; y+=5,octave+=1) {
    for (i=0; i<5; i++) {
      var n = pentatonic[i] + 12*octave + OFFSET;
      frequencies[y+i] = Math.pow(2, n/12)*BASE;
    }
  }
}

var last="";
function playNote(x, y) {
  var key = x + "," + y;
  if (last == key) return;
  last = key;
  ks[y].reset(null, frequencies[y]);
}
function audioProcess(buffer, channelCount) {
  var l = buffer.length, i, n, y;
  for (i=0; i<l; i+=channelCount) {
    for (y=0; y<yres; y++) { ks[y].generate(); }

    for (n=0; n<channelCount; n++) {
      buffer[n+i] = 0;
      var channelPan = 1-(n/(channelCount-1));
      for (y=0; y<yres; y++) {
	// y = 0 is on left; y = yres-1 is on right
	var samplePan = (y/(yres-1));
	var sample = ks[y].getMix(); // remove DC
	buffer[n+i] += Math.abs(channelPan - samplePan) * sample;
      }
      buffer[n+1] /= 2; // tweak volume down from maximum
    }
  }
}

window.onload = function() {
  if ( Detector.webgl ) {
    init();
    window.addEventListener( 'resize', onWindowResize, false);
    onWindowResize();

    // start audio engine
    initFrequencies();
    for (var y=0; y<yres; y++) {
      ks[y] = new KS(44100, 0);
    }
    audioDev = audioLib.AudioDevice(audioProcess, 2);
    for (var y=0; y<yres; y++) { ks[y].sampleRate = audioDev.sampleRate; }

    // start animating!
    animate();
  } else {
    document.body.appendChild( Detector.getWebGLErrorMessage() );
  }
};
