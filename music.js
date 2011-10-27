var SCREEN_ASPECT_RATIO = 4/3;
var size = 10, res = 32, sizeres = size * res, halfsizeres = sizeres / 2;
var buffer1 = [], buffer2 = [], temp;
var grid = [], plane;
var scene, camera, light, renderer;
var geometry, material;
var mouse, projector, ray, intersects = [];
var stats;

function init() {

    var container = document.body;

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    for ( var i = 0, l = res * res; i < l; i ++ ) {

	buffer1[ i ] = 0;
	buffer2[ i ] = 0;

    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 50, SCREEN_ASPECT_RATIO, 1, 2000 );
    camera.position.x = 100 + sizeres;
    camera.position.y = 200;
    camera.position.z = 100 + sizeres;
    camera.lookAt( new THREE.Vector3( halfsizeres, - 50, halfsizeres ) );
    scene.add( camera );

    scene.add( new THREE.AmbientLight( 0x808080 ) );

    light = new THREE.SpotLight( 0xffffff, 1.25 );
    light.position.set( - 500, 900, 600 );
    light.target.position.set( halfsizeres, 0, halfsizeres );
    light.castShadow = true;
    scene.add( light );

    geometry = new THREE.HexPrismGeometry( size/2, size );
    geometry.applyMatrix( new THREE.Matrix4().setRotationX(Math.PI/2) );
    geometry.applyMatrix( new THREE.Matrix4().setTranslation( 0, size/2, 0 ) );
    material = new THREE.MeshLambertMaterial( { color: 0xd0d0d0 } );

    for ( var i = 0, l = res * res; i < l; i ++ ) {

	cube = new THREE.Mesh( geometry, material );
	cube.position.x = size + ( ( i % res ) * 10 );
	cube.position.z = size + ( Math.floor( i / res ) * 10 );
	cube.castShadow = true;
	cube.receiveShadow = true;
	scene.add( cube );

	grid.push( cube );

    }

    geometry = new THREE.PlaneGeometry( sizeres, sizeres );

    plane = new THREE.Mesh( geometry, material );
    plane.position.x = halfsizeres;
    plane.position.z = halfsizeres;
    plane.rotation.x = - 90 * Math.PI / 180;
    plane.visible = false;
    scene.add( plane );

    renderer = new THREE.WebGLRenderer();

    renderer.shadowMapEnabled = true;
    renderer.shadowMapSoft = true;

    renderer.shadowCameraNear = 3;
    renderer.shadowCameraFar = camera.far;
    renderer.shadowCameraFov = 50;

    renderer.shadowMapBias = 0.0039;
    renderer.shadowMapDarkness = 0.5;
    renderer.shadowMapWidth = 512;
    renderer.shadowMapHeight = 512;

    container.appendChild( renderer.domElement );
    renderer.domElement.style.position = "absolute";

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

    if ( intersects.length ) {

	var point = intersects[ 0 ].point;
	var x = Math.floor( point.x / size );
	var y = Math.floor( point.z / size );

	buffer1[ x + y * res ] = 10;

    }

    var bottom = res * res - res;

    // update buffers
    for ( var i = 0, l = res * res; i < l; i ++ ) {

	var x1, x2, y1, y2;

	if ( i % res == 0 ) {

	    // left edge

	    x1 = 0;
	    x2 = buffer1[ i + 1 ];

	} else if ( i % res == res - 1 ) {

	    // right edge

	    x1 = buffer1[ i - 1 ];
	    x2 = 0;

	} else {

	    x1 = buffer1[ i - 1 ];
	    x2 = buffer1[ i + 1 ];

	}

	if ( i < res ) {

	    // top edge

	    y1 = 0;
	    y2 = buffer1[ i + res ];

	} else if ( i > l - res - 1 ) {

	    // bottom edge

	    y1 = buffer1[ i - res ];
	    y2 = 0;

	} else {

	    y1 = buffer1[ i - res ];
	    y2 = buffer1[ i + res ];

	}

	buffer2[ i ] = ( x1 + x2 + y1 + y2 ) / 1.9 - buffer2[ i ];
	buffer2[ i ] -= buffer2[ i ] / 10;

    }

    temp = buffer1;
    buffer1 = buffer2;
    buffer2 = temp;

    // update grid

    for ( var i = 0, l = res * res; i < l; i ++ ) {

	grid[ i ].scale.y += ( Math.max( 0.1, 0.1 + buffer2[ i ] ) - grid[ i ].scale.y ) * 0.1;

    }

    renderer.render( scene, camera );

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

if ( Detector.webgl ) {

    init();
    window.addEventListener( 'resize', onWindowResize, false);
    onWindowResize();
    animate();

} else {

    document.body.appendChild( Detector.getWebGLErrorMessage() );

}

