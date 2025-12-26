import * as THREE from "./three.js/three.module.js"

// This is a basic asyncronous shader loader for THREE.js.
function ShaderLoader(vertex_url, fragment_url, onLoad, onProgress, onError) {
	return new Promise( (resolve, reject) => {
    var vertex_loader = new THREE.XHRLoader(THREE.DefaultLoadingManager);
    vertex_loader.setResponseType('text');
    vertex_loader.load(vertex_url, function (vertex_text) {
        var fragment_loader = new THREE.XHRLoader(THREE.DefaultLoadingManager);
        fragment_loader.setResponseType('text');
        fragment_loader.load(fragment_url, function (fragment_text) {
			resolve( { vertex: vertex_text, fragment: fragment_text } );
            //onLoad(vertex_text, fragment_text);
        });
    }, onProgress, onError);
	} );
}


export function getShaderMaterial() {
	return ShaderLoader('./2dgame.vert', './2dgame.frag') .then( ( s)=>{
		return new THREE.ShaderMaterial( {
			defines:{
				USE_MAP:'',
				USE_UV:'',
			},
			uniforms: {
				x : { type: "f", value : 0 },
				y : { type: "f", value : 0 },
				angle : { type: "f", value : 0 },
				edge_only : { type: "f", value : 0 },
				icons : { type : "t", value : null },
				icon_loc : { type : "t", value : null },
				map_ul : { type : "t", value : null },
				map_ur : { type : "t", value : null },
				map_ll : { type : "t", value : null },
				map_lr : { type : "t", value : null },
				
			},
			transparent : true,
			blending: THREE.NormalBlending,
			vertexShader: s.vertex,
			fragmentShader: s.fragment,
		} ) ;
	});

}
