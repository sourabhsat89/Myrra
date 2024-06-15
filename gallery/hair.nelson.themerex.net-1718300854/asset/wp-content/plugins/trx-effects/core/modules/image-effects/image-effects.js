/* global jQuery:false, TRX_EFFECTS_STORAGE:false */

(function() {

	"use strict";

	// Settings
	var planeClassPrefix = 'trx_effects_image_effects_on_';		// class prefix of wrappers with image

	var globalCanvas = false;									// true - one canvas for all images is used (twitches when scrolling the page),
																// false - separate canvas for each image is created (smooth scrolling, but WebKit limit: maximum of 16 objects per page)

	var permanentDrawing = globalCanvas || false;				// true - permanent redraw images on canvas,
																// false - redraw only on ready and on hover

	var curtains = null;										// global curtains object (used if globalCanvas is true)

	var $document = jQuery(document);

	var firstLoad = false;


	window.addEventListener("load", function() {
		firstLoad = true;
		if ( typeof trx_effects_apply_filters == 'function' ) {
			globalCanvas = trx_effects_apply_filters( 'trx_effects_filter/image_effects_use_global_canvas', globalCanvas );
			permanentDrawing = globalCanvas || false;
		}
		create_planes();
	} );

	function create_planes() {

		// not available in the edit mode of Elementor
		if ( typeof window.elementorFrontend !== 'undefined' && elementorFrontend.isEditMode() ) {
			return;
		}

		// get our plane element
		var planeElements = document.querySelectorAll('[class*="' + planeClassPrefix + '"]:not(.trx_effects_image_effects_inited)');

		// exit if no image effects are present on the current page
		if ( planeElements.length === 0 ) return;

		// create global canvas and append it to the body
		if ( globalCanvas ) {
			curtains = create_canvas( document.body );
		}

		// create planes and handle them
		trx_effects_when_images_loaded( jQuery( planeElements ), function() {
			var effect;
			for ( var i = 0; i < planeElements.length; i++ ) {
				effect = get_effect_name( planeElements[i] );
				if ( effect && typeof window['trx_effects_image_effects_callback_' + effect] == 'function' ) {
					window['trx_effects_image_effects_callback_' + effect]( curtains, planeElements[i], i, planeElements.length );
					planeElements[i].classList.add( 'trx_effects_image_effects_inited' );
				}
				// mark body as all planes are loaded
				if ( i === planeElements.length - 1 ) {
					document.body.classList.add( 'trx_effects_image_effects_planes_loaded' );
				}
			}
		} );
	}
	
	$document.on( 'trx_effects_action_got_ajax_response', function() {
		if ( firstLoad ) create_planes();
	} );
	$document.on( 'trx_effects_action_init_hidden_elements', function() {
		if ( firstLoad ) create_planes();
	} );
	$document.on('trx_effects_action_before_remove_content', function( e, cont ) {
		jQuery( '.trx_effects_image_effects_inited' ).each( function() {
			var $self = jQuery( this ),
				curtains = $self.data('curtains'),
				plane    = $self.data('curtains-plane');
			if ( curtains && plane ) {
				curtains.removePlane( plane );
			}
		});
	});
	$document.on('trx_effects_action_after_add_content', function( e, cont ) {
		jQuery( '.trx_effects_image_effects_inited' ).each( function() {
			jQuery( this )
				.removeClass('trx_effects_image_effects_inited')
				.find( '[id^="trx_effects_image_effects_canvas_"]' ).remove().end()
				.find( '.trx_effects_image_effects_holder' ).removeClass('trx_effects_image_effects_holder').end();
		});
	});


	// Utilities
	//-------------------------------------------

	// Linear interpolation
	function lerp( start, end, amt ){
		return (1 - amt) * start + amt * end;
	}

	// Return name of image effect for element
	function get_effect_name( elm ) {
		var name = '';
		for ( var i=0; i < elm.classList.length; i++ ) {
			if ( elm.classList[i].indexOf( planeClassPrefix ) === 0 ) {
				name = elm.classList[i].substring( planeClassPrefix.length );
				break;
			}
		}
		return name;
	}

	// Change value in specified time
	function tween_value( args ) {
		// Defaults
		if ( ! args.time ) args.time = 1;	// 1s

		// Use TweenMax (if loaded)
		if ( typeof TweenMax != 'undefined' ) {
			var t = {
				value: args.start
			};
			return TweenMax.to( t, args.time, {
							value: args.end,
							ease: args.ease ? args.ease : Power2.easeOut,
							onUpdate: function() {
								args.callbacks.onUpdate( t.value );
							},
							onComplete: function() {
								if ( args.callbacks.onComplete ) {
									args.callbacks.onComplete();
								}
							}
						} );

		// Internal tween manager
		} else {
			var amount = 0.1;
			return setInterval( function() {
				t.value = lerp( t.value, args.end, amount );
				args.callbacks.onUpdate( t.value );
				if (  Math.abs( t.value - args.end ) < 0.0001 ) {
					t.value = args.end;
					if ( args.callbacks.onComplete ) {
						args.callbacks.onComplete();
					}
				}
			}, Math.max(1, Math.round( args.time * 1000 / ( Math.abs( args.end - args.start ) / amount ) ) ) );
		}
	}

	// Stop changing value
	function tween_stop( handler ) {
		// Use TweenMax (if loaded)
		if ( typeof TweenMax != 'undefined' ) {
			if ( handler ) handler.kill();

		// Internal tween manager
		} else {
			if ( handler ) clearTimeout( handler );

		}
	}

	// Add canvas holder
	var total = 0;
	function create_canvas( item ) {

		// Append canvas holder to the item
		var id = 'trx_effects_image_effects_canvas_'+total++,
			div = document.createElement("div");
		div.setAttribute('id', id);
		item.appendChild(div);

		// Set up our WebGL context and append the canvas to our wrapper
		var webGLCurtain = new Curtains({
			watchScroll: globalCanvas,
			premultipliedAlpha: true,	// to avoid gray edge on images in effects 'waves', 'smudge', etc. (who changes the image border geometry)
			container: id	// if not specified - library create own canvas container
		});

		// Handling errors
		webGLCurtain
			.onError(function() {
				// we will add a class to the document body to display original images
				document.body.classList.add("no-curtains", "trx_effects_image_effects_planes_loaded");
			})
			.onContextLost(function() {
				// on context lost, try to restore the context
				webGLCurtain.restoreContext();
			});

		return webGLCurtain;
	}

	// Convert our mouse/touch position to coordinates relative to the vertices of the plane
	function mouse_to_plane_coords( plane, mpos ) {
		var w = plane.htmlElement.clientWidth, 	cw = w / 2,
			h = plane.htmlElement.clientHeight,	ch = h / 2;
		return {
				x:  ( mpos.x - cw ) / cw,
				y: -( mpos.y - ch ) / ch
			};
	}



	// Effect 'Waves'
	//-------------------------------------------
	
	// Create plane.
	// Attention! All callbacks must be in a global scope!
	window.trx_effects_image_effects_callback_waves = function( curtains_global, elm, index, total ) {

		var curtains = curtains_global ? curtains_global : null;

		var waveForceMin = 0,
			waveForceMax = 7;

		var waveFactor = elm.getAttribute('data-trx-effects-image-effect-waves-factor') || 4;

		var mouseIn = false;

		var scaleOnHover = elm.getAttribute('data-trx-effects-image-effect-scale') > 0,
			scaleFactor = 0;

		var paddingOnHover = typeof trx_effects_apply_filters == 'function'
								? trx_effects_apply_filters( 'trx_effects_filter/image_effects_padding', 0.04, 'waves' )
								: 0.04;

		var effectStrength = Math.max( 10.0, Math.min( 50.0, elm.getAttribute('data-trx-effects-image-effect-strength') || 30 ) );

		var plane = null,
			parent = null,
			img = elm.querySelector( 'img' );

		if ( img ) {
			parent = img.parentNode;
			parent.classList.add('trx_effects_image_effects_holder');
			img.setAttribute('data-sampler', 'wavesTexture');
			if ( ! globalCanvas ) {
				curtains = create_canvas(parent);
				if ( curtains ) jQuery(elm).data('curtains', curtains);
			}
			if ( curtains ) {
				if ( ! permanentDrawing ) curtains.disableDrawing();
				plane = curtains.addPlane( parent, get_params( elm, img, parent ) );
				if ( plane ) {
					jQuery(elm).data('curtains-plane', plane);
					handle_plane( plane );
				}
			}
		}

		// Return plane params
		function get_params() {
			var vs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// those are the mandatory attributes that the lib sets
				attribute vec3 aVertexPosition;
				attribute vec2 aTextureCoord;

				// those are mandatory uniforms that the lib sets and that contain our model view and projection matrix
				uniform mat4 uMVMatrix;
				uniform mat4 uPMatrix;

				// our texture matrix uniform
				uniform mat4 wavesTextureMatrix;

				// if you want to pass your vertex and texture coords to the fragment shader
				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;

				// effect control vars declared inside our javascript
				uniform float uTime;
				uniform float uMouseMoveStrength;
				uniform float uEffectStrength;
				uniform float uWaveFactor;
				uniform vec2 uMousePosition;
				uniform float hoveringWaveForce;
				uniform float uPadding;

				void main() {
					vec3 vertexPosition = aVertexPosition;
					float distanceFromMouse = distance(uMousePosition, vec2(vertexPosition.x, vertexPosition.y));
					float waveSinusoid = cos(uWaveFactor * (distanceFromMouse - (uTime / 75.0)));
					float distanceStrength = 0.4 / (distanceFromMouse + 0.4);
					float distortionEffect = distanceStrength * waveSinusoid * uMouseMoveStrength / uEffectStrength;
					vertexPosition.z +=  distortionEffect;
					vertexPosition.x +=  distortionEffect * (uMousePosition.x - vertexPosition.x) * hoveringWaveForce * 3.0;
					vertexPosition.y +=  distortionEffect * (uMousePosition.y - vertexPosition.y) * hoveringWaveForce;
					gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, (1.0 + uPadding));
					vTextureCoord = (wavesTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
					vVertexPosition = vertexPosition;
				}
			`;
			
			var fs = `
				#ifdef GL_ES
					precision mediump float;
				#endif
				// get our varying variables
				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;

				// our texture sampler
				uniform sampler2D wavesTexture;

				// effect control vars
				uniform float displacement;

				void main() {
					if ( false ) {
						float intensity = 1.0;
						vec2 textureCoord = vTextureCoord;
						vec4 image1 = texture2D(wavesTexture, textureCoord);
						vec4 image2 = texture2D(wavesTexture, textureCoord);
						vec4 texture1 = texture2D(wavesTexture, vec2(textureCoord.x, textureCoord.y + displacement * (image2 * intensity)));
						vec4 texture2 = texture2D(wavesTexture, vec2(textureCoord.x, textureCoord.y + (1.0 - displacement) * (image1 * intensity)));
						vec4 result = mix(texture1, texture2, displacement);
						gl_FragColor = result;
					} else {
						vec2 textureCoord = vTextureCoord;
						gl_FragColor = texture2D(wavesTexture, textureCoord);
					}
				}
			`;

			return {
				vertexShader: vs,
				fragmentShader: fs,
				widthSegments: 10,
				heightSegments: 10,
				uniforms: {
					time: {
						name: "uTime",
						type: "1f",
						value: 0
					},
					mousePosition: {
						name: "uMousePosition",
						type: "2f",
						value: [-.5, .5]
					},
					mouseMoveStrength: {
						name: "uMouseMoveStrength",
						type: "1f",
						value: .2
					},
					effectStrength: {
						name: "uEffectStrength",
						type: "1f",
						value: effectStrength
					},
					displacement: {
						name: "displacement",
						type: "1f",
						value: 0
					},
					waveFactor: {
						name: "uWaveFactor",
						type: "1f",
						value: waveFactor
					},
					hoveringWaveForce: {
						name: "hoveringWaveForce",
						type: "1f",
						value: waveForceMin
					},
					padding: {
						name: "uPadding",
						type: "1f",
						value: 0
					}
				}
			};
		}

		// handle plane
		function handle_plane( plane ) {
			plane
				.onLoading(function() {
//					console.log('Waves onLoading');
				})
				.onReady(function() {
//					console.log('Waves onReady: Plane '+index+' of '+total+' is ready');
					// first render plane
					if ( ! permanentDrawing ) curtains.needRender();
					// init tweens
					plane.tweenForce = null;
					plane.tweenScale = null;
					plane.tweenPadding = null;
					// now that our plane is ready we can listen to mouse move event
					function mouse_move() {
						if ( ! mouseIn ) {
							mouse_enter();
						}
					}
					function mouse_enter() {
						if ( ! mouseIn ) {
							mouseIn = true;
							change_wave_force( waveForceMax );
							change_scale( 1 );
							if ( paddingOnHover ) {
								change_padding( paddingOnHover );
							}
						}
					}
					function mouse_leave() {
						if ( mouseIn ) {
							mouseIn = false;
							change_wave_force( waveForceMin );
							change_scale( 0 );
							if ( paddingOnHover ) {
								change_padding( 0 );
							}
						}
					}
					elm.addEventListener("mousemove",  mouse_move );
					elm.addEventListener("touchmove",  mouse_move );
					elm.addEventListener("mouseenter", mouse_enter );
					elm.addEventListener("touchstart", mouse_enter );
					elm.addEventListener("mouseleave", mouse_leave );
					elm.addEventListener("touchend",   mouse_leave );
				})
				.onRender(function() {
//					if ( globalCanvas ) plane.updatePosition();
					plane.uniforms.time.value++;

				})
				.onAfterResize(function() {
//					console.log('Waves afterResize: Plane '+index+' of '+total+' is resized');
				});

			// Change wave force value
			function change_wave_force( to ) {
				if ( plane.tweenForce ) {
					tween_stop( plane.tweenForce );
				}
				plane.tweenForce = tween_value( {
					start: plane.uniforms.hoveringWaveForce.value,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							plane.uniforms.hoveringWaveForce.value = value;
						},
						onComplete: function() {
							plane.tweenForce = null;
						}
					}
				} );
			}

			// Change padding value
			function change_padding( to ) {
				if ( plane.tweenPadding ) {
					tween_stop( plane.tweenPadding );
				}
				plane.tweenPadding = tween_value( {
					start: plane.uniforms.padding.value,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							plane.uniforms.padding.value = value;
						},
						onComplete: function() {
							plane.tweenPadding = null;
						}
					}
				} );
			}

			// Change scale
			function change_scale( to ) {
				if ( plane.tweenScale ) {
					tween_stop( plane.tweenScale );
				}
				if ( ! permanentDrawing ) {
					curtains.enableDrawing();
				}
				plane.tweenScale = tween_value( {
					start: scaleFactor,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							scaleFactor = value;
							if ( scaleOnHover ) {
								plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
							}
						},
						onComplete: function() {
							plane.tweenScale = null;
							if ( ! permanentDrawing && to === 0 ) {
								curtains.disableDrawing();
							}
						}
					}
				} );
			}
		}
	};


	// Effect 'Waves2'
	//-------------------------------------------
	
	// Create plane.
	// Attention! All callbacks must be in a global scope!
	window.trx_effects_image_effects_callback_waves2 = function( curtains_global, elm, index, total ) {

		var curtains = curtains_global ? curtains_global : null;

		var waveForceMin = 0,
			waveForceMax = 2;

		var waveFactor = elm.getAttribute('data-trx-effects-image-effect-waves-factor') || 4;

		var mouseIn = false;

		var scaleOnHover = elm.getAttribute('data-trx-effects-image-effect-scale') > 0,
			scaleFactor = 0;

		var paddingOnHover = typeof trx_effects_apply_filters == 'function'
								? trx_effects_apply_filters( 'trx_effects_filter/image_effects_padding', 0.04, 'waves2' )
								: 0.04;

		var effectStrength = Math.max( 10.0, Math.min( 50.0, elm.getAttribute('data-trx-effects-image-effect-strength') ) );

		var plane = null,
			parent = null,
			img = elm.querySelector( 'img' );

		if ( img ) {
			parent = img.parentNode;
			parent.classList.add('trx_effects_image_effects_holder');
			img.setAttribute('data-sampler', 'waves2Texture');
			if ( ! globalCanvas ) {
				curtains = create_canvas(parent);
				if ( curtains ) jQuery(elm).data('curtains', curtains);
			}
			if ( curtains ) {
				if ( ! permanentDrawing ) curtains.disableDrawing();
				plane = curtains.addPlane( parent, get_params( elm, img, parent ) );
				if ( plane ) {
					jQuery(elm).data('curtains-plane', plane);
					handle_plane( plane );
				}
			}
		}

		// Return plane params
		function get_params( elm, img, parent ) {
			var vs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// default mandatory variables
				attribute vec3 aVertexPosition;
				attribute vec2 aTextureCoord;

				uniform mat4 uMVMatrix;
				uniform mat4 uPMatrix;

				// our texture matrix
				uniform mat4 waves2TextureMatrix;

				// custom variables
				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;
				uniform float uTime;
				uniform vec2 uResolution;
				uniform vec2 uMousePosition;
				uniform float uMouseMoveStrength;
				uniform float uEffectStrength;
				uniform float uWaveFactor;
				uniform float uPadding;

				void main() {
					vec3 vertexPosition = aVertexPosition;
					// get the distance between our vertex and the mouse position
					float distanceFromMouse = distance(uMousePosition, vec2(vertexPosition.x, vertexPosition.y));
					// calculate our wave effect
					float waveSinusoid = cos(uWaveFactor * (distanceFromMouse - (uTime / 75.0)));
					// attenuate the effect based on mouse distance
					float distanceStrength = 0.4 / (distanceFromMouse + 0.4);
					// calculate our distortion effect
					float distortionEffect = distanceStrength * waveSinusoid * uMouseMoveStrength / uEffectStrength;
					// apply it to our vertex position
					vertexPosition.z += distortionEffect;
					vertexPosition.x += distortionEffect * (uMousePosition.x - vertexPosition.x) * (uResolution.x / uResolution.y);
					vertexPosition.y += distortionEffect * (uMousePosition.y - vertexPosition.y);
					gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, (1.0 + uPadding));
					// varyings
					vTextureCoord = (waves2TextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
					vVertexPosition = vertexPosition;
				}
			`;
			var fs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;
				uniform sampler2D waves2Texture;

				void main() {
					// apply our texture
					vec4 finalColor = texture2D(waves2Texture, vTextureCoord);
					// fake shadows based on vertex position along Z axis
					finalColor.rgb -= clamp(-vVertexPosition.z, 0.0, 1.0);
					// fake lights based on vertex position along Z axis
					finalColor.rgb += clamp(vVertexPosition.z, 0.0, 1.0);
					// handling premultiplied alpha (useful if we were using a png with transparency)
					finalColor = vec4(finalColor.rgb * finalColor.a, finalColor.a);
					gl_FragColor = finalColor;
				}
			`;

			return {
				vertexShader: vs,
				fragmentShader: fs,
				widthSegments: 20,
				heightSegments: 20,
				uniforms: {
					resolution: { // resolution of our plane
						name: "uResolution",
						type: "2f", // notice this is an length 2 array of floats
						value: [ parent.clientWidth, parent.clientHeight ]
					},
					time: { // time uniform that will be updated at each draw call
						name: "uTime",
						type: "1f",
						value: 0
					},
					mousePosition: { // our mouse position
						name: "uMousePosition",
						type: "2f", // again an array of floats
						value: [-.5, .5]
					},
					mouseMoveStrength: { // the mouse move strength
						name: "uMouseMoveStrength",
						type: "1f",
						value: 0
					},
					effectStrength: { // the effect strength
						name: "uEffectStrength",
						type: "1f",
						value: effectStrength
					},
					waveFactor: {    // waves frequency
						name: "uWaveFactor",
						type: "1f",
						value: waveFactor
					},
					padding: { // padding around image on hover
						name: "uPadding",
						type: "1f",
						value: 0
					}
				}
			};
		}

		// handle plane
		function handle_plane( plane ) {
			plane
				.onLoading(function() {
					//console.log(plane.loadingManager.sourcesLoaded);
				})
				.onReady(function() {
//					console.log('Plane '+index+' of '+total+' is ready');
					// set a fov of 35 to reduce perspective
					plane.setPerspective(35);
					// first render plane
					if ( ! permanentDrawing ) curtains.needRender();
					// init tweens
					plane.tween = null;
					plane.tweenScale = null;
					// now that our plane is ready we can listen to mouse move event
					function mouse_move() {
						if ( ! mouseIn ) {
							mouse_enter();
						}
					}
					function mouse_enter() {
						if ( ! mouseIn ) {
							mouseIn = true;
							change_wave_force( waveForceMax );
							change_scale( 1 );
							if ( paddingOnHover ) {
								change_padding( paddingOnHover );
							}
						}
					}
					function mouse_leave() {
						if ( mouseIn ) {
							mouseIn = false;
							change_wave_force( waveForceMin );
							change_scale( 0 );
							if ( paddingOnHover ) {
								change_padding( 0 );
							}
						}
					}
					elm.addEventListener("mousemove",  mouse_move );
					elm.addEventListener("touchmove",  mouse_move );
					elm.addEventListener("mouseenter", mouse_enter );
					elm.addEventListener("touchstart", mouse_enter );
					elm.addEventListener("mouseleave", mouse_leave );
					elm.addEventListener("touchend",   mouse_leave );
				})
				.onRender(function() {
					// increment our time uniform
					plane.uniforms.time.value++;
				})
				.onAfterResize(function() {
//					console.log('Plane '+index+' of '+total+' is resized');
					var planeBoundingRect = plane.getBoundingRect();
					plane.uniforms.resolution.value = [ planeBoundingRect.width, planeBoundingRect.height ];
				});
		}

		// Change wave force value
		function change_wave_force( to ) {
			if ( plane.tween ) {
				tween_stop( plane.tween );
			}
			plane.tween = tween_value( {
				start: plane.uniforms.mouseMoveStrength.value,
				end: to,
				time: 1.25,
				callbacks: {
					onUpdate: function(value) {
						plane.uniforms.mouseMoveStrength.value = value;
					},
					onComplete: function() {
						plane.tween = null
					}
				}
			} );
		}

		// Change padding value
		function change_padding( to ) {
			if ( plane.tweenPadding ) {
				tween_stop( plane.tweenPadding );
			}
			plane.tweenPadding = tween_value( {
				start: plane.uniforms.padding.value,
				end: to,
				time: 1.25,
				callbacks: {
					onUpdate: function(value) {
						plane.uniforms.padding.value = value;
					},
					onComplete: function() {
						plane.tweenPadding = null;
					}
				}
			} );
		}

		// Change scale
		function change_scale( to ) {
			if ( plane.tweenScale ) {
				tween_stop( plane.tweenScale );
			}
			if ( ! permanentDrawing ) {
				curtains.enableDrawing();
			}
			plane.tweenScale = tween_value( {
				start: scaleFactor,
				end: to,
				time: 1.25,
				callbacks: {
					onUpdate: function(value) {
						scaleFactor = value;
						if ( scaleOnHover ) {
							plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
						}
					},
					onComplete: function() {
						plane.tweenScale = null;
						if ( ! permanentDrawing && to === 0 ) {
							curtains.disableDrawing();
						}
					}
				}
			} );
		}
	};


	// Effect 'Smudge'
	//-------------------------------------------
	
	// Create plane.
	// Attention! All callbacks must be in a global scope!
	window.trx_effects_image_effects_callback_smudge = function( curtains_global, elm, index, total ) {

		var curtains = curtains_global ? curtains_global : null;

		var enableDrawing = false;

		// track the mouse positions to send it to the shaders
		var mousePosition = {
			x: 0,
			y: 0
		};

		// we will keep track of the last position in order to calculate the movement strength/delta
		var mouseLastPosition = {
			x: 0,
			y: 0
		};

		var mouseStrength = false;

		var mouseIn = false;

		var scaleOnHover = elm.getAttribute('data-trx-effects-image-effect-scale') > 0,
			scaleFactor = 0;

		var paddingOnHover = typeof trx_effects_apply_filters == 'function'
								? trx_effects_apply_filters( 'trx_effects_filter/image_effects_padding', 0.04, 'smudge' )
								: 0.04;

		var effectStrength = Math.max( 10.0, Math.min( 50.0, elm.getAttribute('data-trx-effects-image-effect-strength') ) );

		var deltas = {
			max: 0,
			applied: 0
		};

		var plane = null,
			parent = null,
			img = elm.querySelector( 'img' );

		if ( img ) {
			parent = img.parentNode;
			parent.classList.add('trx_effects_image_effects_holder');
			img.setAttribute('data-sampler', 'smudgeTexture');
			if ( ! globalCanvas ) {
				curtains = create_canvas(parent);
				if ( curtains ) jQuery(elm).data('curtains', curtains);
			}
			if ( curtains ) {
				if ( ! permanentDrawing ) curtains.disableDrawing();
				plane = curtains.addPlane( parent, get_params( elm, img, parent ) );
				if ( plane ) {
					jQuery(elm).data('curtains-plane', plane);
					handle_plane( plane );
				}
			}
		}

		// Return plane params
		function get_params( elm, img, parent ) {
			var vs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// default mandatory variables
				attribute vec3 aVertexPosition;
				attribute vec2 aTextureCoord;

				uniform mat4 uMVMatrix;
				uniform mat4 uPMatrix;

				// our texture matrix
				uniform mat4 smudgeTextureMatrix;

				// custom variables
				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;
				uniform float uTime;
				//uniform vec2 uResolution;
				uniform vec2 uMousePosition;
				uniform float uMouseMoveStrength;
				uniform float uEffectStrength;
				uniform float uPadding;

				void main() {
					vec3 vertexPosition = aVertexPosition;
					// get the distance between our vertex and the mouse position
					float distanceFromMouse = distance(uMousePosition, vec2(vertexPosition.x, vertexPosition.y));
					// attenuate the effect based on mouse distance
					float distanceStrength = 0.4 / (distanceFromMouse + 0.4);
					// calculate our distortion effect
					float distortionEffect = distanceStrength * uMouseMoveStrength / uEffectStrength;
					// apply it to our vertex position
					vertexPosition.z += distortionEffect;
					//vertexPosition.x += distortionEffect * (uMousePosition.x - vertexPosition.x) * (uResolution.x / uResolution.y);
					vertexPosition.x += distortionEffect * (uMousePosition.x - vertexPosition.x);
					vertexPosition.y += distortionEffect * (uMousePosition.y - vertexPosition.y);
					gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, (1.0+uPadding));
					// varyings
					vTextureCoord = (smudgeTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
					vVertexPosition = vertexPosition;
				}
			`;
			var fs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;
				uniform sampler2D smudgeTexture;

				void main() {
					// apply our texture
					vec4 finalColor = texture2D(smudgeTexture, vTextureCoord);
					// fake shadows based on vertex position along Z axis
					finalColor.rgb -= clamp(-vVertexPosition.z, 0.0, 1.0);
					// fake lights based on vertex position along Z axis
					finalColor.rgb += clamp(vVertexPosition.z, 0.0, 1.0);
					// handling premultiplied alpha (useful if we were using a png with transparency)
					finalColor = vec4(finalColor.rgb * finalColor.a, finalColor.a);
					gl_FragColor = finalColor;
				}
			`;

			return {
				vertexShader: vs,
				fragmentShader: fs,
				widthSegments: 20,
				heightSegments: 20,
				uniforms: {
					/*
					resolution: { // resolution of our plane
						name: "uResolution",
						type: "2f", // notice this is an length 2 array of floats
						value: [ parent.clientWidth, parent.clientHeight ]
					},
					*/
					time: { // time uniform that will be updated at each draw call
						name: "uTime",
						type: "1f",
						value: 0
					},
					mousePosition: { // our mouse position
						name: "uMousePosition",
						type: "2f", // again an array of floats
						value: [ mousePosition.x, mousePosition.y ]
					},
					mouseMoveStrength: { // the mouse move strength
						name: "uMouseMoveStrength",
						type: "1f",
						value: 0
					},
					effectStrength: { // the smudge strength
						name: "uEffectStrength",
						type: "1f",
						value: effectStrength
					},
					padding: { 		// paddings around image on hover
						name: "uPadding",
						type: "1f",
						value: 0
					}
				}
			};
		}

		// handle plane
		function handle_plane( plane ) {
			plane
				.onLoading(function() {
					//console.log(plane.loadingManager.sourcesLoaded);
				})
				.onReady(function() {
//					console.log('Plane '+index+' of '+total+' is ready');
					// set a fov of 35 to reduce perspective
					plane.setPerspective(35);
					// apply a little effect once everything is ready
					deltas.max = 2;
					// first render plane
					if ( ! permanentDrawing ) curtains.needRender();
					// init tweens
					plane.tweenScale = null;
					// now that our plane is ready we can listen to mouse move event
					function mouse_move(e) {
						if ( ! mouseIn ) {
							mouse_enter();
						}
						handle_movement(e, plane);
					}
					function mouse_enter() {
						if ( ! mouseIn ) {
							mouseIn = true;
							change_scale( 1 );
							if ( paddingOnHover ) {
								change_padding(paddingOnHover);
							}
						}
					}
					function mouse_leave() {
						if ( mouseIn ) {
							mouseIn = false;
							change_scale( 0 );
							if ( paddingOnHover ) {
								change_padding(0);
							}
						}
					}
					elm.addEventListener("mousemove",  mouse_move );
					elm.addEventListener("touchmove",  mouse_move );
					elm.addEventListener("mouseenter", mouse_enter );
					elm.addEventListener("touchstart", mouse_enter );
					elm.addEventListener("mouseleave", mouse_leave );
					elm.addEventListener("touchend",   mouse_leave );
				})
				.onRender(function() {
					// increment our time uniform
					plane.uniforms.time.value++;
					// decrease both deltas by damping : if the user doesn't move the mouse, effect will fade away
					deltas.applied += (deltas.max - deltas.applied) * 0.02;
					deltas.max += (0 - deltas.max) * 0.01;
					// send the new mouse move strength value
					plane.uniforms.mouseMoveStrength.value = deltas.applied;
					if ( ! permanentDrawing && ! enableDrawing && Math.abs(deltas.applied - deltas.max) < 0.001 ) {
						curtains.disableDrawing();
					}
				})
				.onAfterResize(function() {
//					console.log('Plane '+index+' of '+total+' is resized');
					/*
					var planeBoundingRect = plane.getBoundingRect();
					plane.uniforms.resolution.value = [planeBoundingRect.width, planeBoundingRect.height];
					*/
				});
		}

		// handle the mouse move event
		function handle_movement(e, plane) {

			// update mouse last pos
			mouseLastPosition.x = mousePosition.x;
			mouseLastPosition.y = mousePosition.y;

			var mouse = {};

			// touch event
			if (e.targetTouches) {
				mouse.x = globalCanvas ? e.targetTouches[0].clientX : e.targetTouches[0].layerX;
				mouse.y = globalCanvas ? e.targetTouches[0].clientY : e.targetTouches[0].layerY;

			// mouse event
			} else {
				mouse.x = globalCanvas ? e.clientX : e.layerX;
				mouse.y = globalCanvas ? e.clientY : e.layerY;
			}

			// lerp the mouse position a bit to smoothen the overall effect
			mousePosition.x = lerp(mousePosition.x, mouse.x, 0.3);
			mousePosition.y = lerp(mousePosition.y, mouse.y, 0.3);

			// convert our mouse/touch position to coordinates relative to the vertices of the plane
			var mouseCoords = globalCanvas
								? plane.mouseToPlaneCoords(mousePosition.x, mousePosition.y)
								: mouse_to_plane_coords( plane, mousePosition );
			

			// update our mouse position uniform
			plane.uniforms.mousePosition.value = [mouseCoords.x, mouseCoords.y];

			// calculate the mouse move strength
			if ( mouseStrength && mouseLastPosition.x && mouseLastPosition.y ) {
				var delta = Math.sqrt( Math.pow( mousePosition.x - mouseLastPosition.x, 2 ) + Math.pow( mousePosition.y - mouseLastPosition.y, 2 ) ) / 20;
				delta = Math.min(4, delta);
				// update max delta only if it increased
				if ( delta >= deltas.max ) {
					deltas.max = delta;
				}
			} else {
				deltas.max = 2;
			}
		}

		// Change padding value
		function change_padding( to ) {
			if ( plane.tweenPadding ) {
				tween_stop( plane.tweenPadding );
			}
			plane.tweenPadding = tween_value( {
				start: plane.uniforms.padding.value,
				end: to,
				time: 1.25,
				callbacks: {
					onUpdate: function(value) {
						plane.uniforms.padding.value = value;
					},
					onComplete: function() {
						plane.tweenPadding = null;
					}
				}
			} );
		}

		// Change scale
		function change_scale( to ) {
			if ( plane.tweenScale ) {
				tween_stop( plane.tweenScale );
			}
			if ( ! permanentDrawing ) {
				enableDrawing = true;
				curtains.enableDrawing();
			}
			plane.tweenScale = tween_value( {
				start: scaleFactor,
				end: to,
				time: 1.25,
				callbacks: {
					onUpdate: function(value) {
						scaleFactor = value;
						if ( scaleOnHover ) {
							plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
						}
					},
					onComplete: function() {
						plane.tweenScale = null;
						if ( ! permanentDrawing && to === 0 ) {
							enableDrawing = false;
							//curtains.disableDrawing();
						}
					}
				}
			} );
		}

	};


	// Effect 'Tint'
	//-------------------------------------------
	
	// Create plane.
	// Attention! All callbacks must be in a global scope!
	window.trx_effects_image_effects_callback_tint = function( curtains_global, elm, index, total ) {

		var curtains = curtains_global ? curtains_global : null;

		var mouseIn = false;

		var scaleOnHover = elm.getAttribute('data-trx-effects-image-effect-scale') > 0,
			scaleFactor = 0,
			tintColor = elm.getAttribute('data-trx-effects-image-effect-tint-color') || "#efa758";

		var plane = null,
			parent = null,
			img = elm.querySelector( 'img' );

		if ( img ) {
			parent = img.parentNode;
			parent.classList.add('trx_effects_image_effects_holder');
			img.setAttribute('data-sampler', 'tintTexture');
			if ( ! globalCanvas ) {
				curtains = create_canvas(parent);
				if ( curtains ) jQuery(elm).data('curtains', curtains);
			}
			if ( curtains ) {
				if ( ! permanentDrawing ) curtains.disableDrawing();
				plane = curtains.addPlane( parent, get_params( elm, img, parent ) );
				if ( plane ) {
					jQuery(elm).data('curtains-plane', plane);
					handle_plane( plane );
				}
			}
		}

		// Return plane params
		function get_params( elm, img, parent ) {

			var vs = `
				#ifdef GL_ES
					precision mediump float;
				#endif
				
				vec3 permute(vec3 x) {
					return mod((x*34.0+1.0)*x, 289.0);
				}
				
				float snoise(vec2 v) {
					const vec4 C = vec4(0.211325, 0.366025, -0.57735, 0.02439);
					vec2 i = floor(v + dot(v, C.yy)),
						 x0 = v - i + dot(i, C.xx),
						 i1;
					i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0,1.0);
					vec4 x12 = x0.xyxy + C.xxzz;
					x12.xy -= i1,
					i = mod(i, 289.0);
					vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0,i1.x, 1.0)),
						 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
					m = m * m, m = m * m;
					vec3 x = 2.0 * fract(p * C.www) - 1.0,
						 h = abs(x) - 0.5,
						 ox = floor(x + 0.5),
						 a0 = x - ox;
					m *= 1.792843 - 0.853735 * (a0 * a0 + h * h);
					vec3 g;
					g.x = a0.x * x0.x + h.x * x0.y,
					g.yz = a0.yz * x12.xz + h.yz * x12.yw;
					return 130.0 * dot(m, g);
				}
				
				attribute vec3 aVertexPosition;
				attribute vec2 aTextureCoord;

				uniform mat4 uMVMatrix, uPMatrix, tintTextureMatrix;
				uniform float uTime, uMouseOver, uScrollSpeed;

				varying vec2 vTextureCoord;
				varying vec3 vVertexPosition, vNoise;

				void main(){
					vec3 vP = aVertexPosition;
					vec2 sUV = vec2(vP.x * 0.75, vP.y * 0.75);
					vec3 sN = vec3(snoise(sUV * 2.0 - uTime / 360.0));
					float tV = fract(uTime / 540.0),
						  wC = tV * 4.0 - 2.0,
						  dTW = distance(vec2(0.0, vP.y), vec2(0.0, wC));
					//vP.z = cos(dTW * 3.141592) * (0.15 + abs(uScrollSpeed) * 0.4) * (1.0 - uMouseOver),
					vP.z = 0.0,
					gl_Position = uPMatrix * uMVMatrix * vec4(vP, 1.0),
					vVertexPosition = vP,
					vTextureCoord = (tintTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy,
					vNoise = sN;
				}
			`;
			var fs = `
				#ifdef GL_ES
					precision mediump float;
				#endif
				varying vec2 vTextureCoord;
				varying vec3 vVertexPosition,vNoise;

				uniform sampler2D tintTexture;
				uniform float uMouseOver;
				uniform vec3 uColor;

				void main(){
					vec4 f = texture2D(tintTexture, vTextureCoord);
					f.rgb -= clamp(-vVertexPosition.z / 10.0, 0.0, 1.0),
					f.rgb += clamp( vVertexPosition.z / 12.5, 0.0, 1.0);
					vec4 lC = vec4(0.299, 0.587, 0.114, 0.0),
						 l = vec4(1.0),
						 d = vec4(uColor.r / 255.0, uColor.g / 255.0, uColor.b / 255.0, 1.0);
					float lM = dot(f, lC);
					vec4 dT,
						 mC = (l + d) / vec4(2.0);
					dT = lM >= 0.45 ? mix(mC, l, smoothstep(0.45, 0.93125, lM)) : mix(d, mC, smoothstep(-0.03125, 0.45, lM));
					float mN = clamp(uMouseOver * (1.0 - vNoise.r) - 1.0 + uMouseOver * 2.0, 0.0, 1.0);
					f = mix(dT, f, step(0.9, mN)),
					f = vec4(f.rgb * f.a, f.a),
					gl_FragColor = f;
				}
			`;

			return {
				vertexShader: vs,
				fragmentShader: fs,
				widthSegments: 5,
				heightSegments: 40,
				fov: 45,
				drawCheckMargins: {
					top: 15,
					right: 0,
					bottom: 15,
					left: 0
				},
				uniforms: {
					time: {
						name: "uTime",
						type: "1f",
						value: 0	// 180 * index
					},
					mouseOver: {
						name: "uMouseOver",
						type: "1f",
						value: 0
					},
					scrollSpeed: {
						name: "uScrollSpeed",
						type: "1f",
						value: 0
					},
					color: {
						name: "uColor",
						type: "3f",
						value: trx_effects_rgb2components(tintColor)
					}
				}
			};
		}

		// handle plane
		function handle_plane( plane ) {
			plane
				.onReady(function() {
//					console.log('Plane '+index+' of '+total+' is ready');
					// first render plane
					if ( ! permanentDrawing ) curtains.needRender();
					// init tweens
					plane.tween = null;
					plane.tweenScale = null;
					// now that our plane is ready we can listen to mouse move event
					function mouse_move(e) {
						if ( ! mouseIn ) {
							mouse_enter();
						}
					}
					function mouse_enter() {
						if ( ! mouseIn ) {
							mouseIn = true;
							change_mouse_over( 1 );
							change_scale( 1 );
						}
					}
					function mouse_leave() {
						if ( mouseIn ) {
							mouseIn = false;
							change_mouse_over( 0 );
							change_scale( 0 );
						}
					}
					elm.addEventListener("mousemove",  mouse_move );
					elm.addEventListener("touchmove",  mouse_move );
					elm.addEventListener("mouseenter", mouse_enter );
					elm.addEventListener("touchstart", mouse_enter );
					elm.addEventListener("mouseleave", mouse_leave );
					elm.addEventListener("touchend",   mouse_leave );
				})
				.onRender(function() {
					plane.uniforms.time.value++;
				});
		}

		// Change wave force value
		function change_mouse_over( to ) {
			if ( plane.tween ) {
				tween_stop( plane.tween );
			}
			plane.tween = tween_value( {
				start: plane.uniforms.mouseOver.value,
				end: to,
				time: 1.25,
				callbacks: {
					onUpdate: function(value) {
						plane.uniforms.mouseOver.value = value;
						if ( scaleOnHover ) {
							plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
						}
					},
					onComplete: function() {
						plane.tween = null
					}
				}
			} );
		}

		// Change scale
		function change_scale( to ) {
			if ( plane.tweenScale ) {
				tween_stop( plane.tweenScale );
			}
			if ( ! permanentDrawing ) {
				curtains.enableDrawing();
			}
			plane.tweenScale = tween_value( {
				start: scaleFactor,
				end: to,
				time: 1.25,
				callbacks: {
					onUpdate: function(value) {
						scaleFactor = value;
						if ( scaleOnHover ) {
							plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
						}
					},
					onComplete: function() {
						plane.tweenScale = null;
						if ( ! permanentDrawing && to === 0 ) {
							curtains.disableDrawing();
						}
					}
				}
			} );
		}
	};



	// Effect 'Ripple'
	//-------------------------------------------
	
	// Create plane.
	// Attention! All callbacks must be in a global scope!
	window.trx_effects_image_effects_callback_ripple = function( curtains_global, elm, index, total ) {

		var curtains = curtains_global ? curtains_global : null;

		// Common vars
		var mouseIn = false;

		var scaleOnHover = elm.getAttribute('data-trx-effects-image-effect-scale') > 0,
			scaleFactor = 0;

		var effectStrength = Math.max( 10.0, Math.min( 50.0, elm.getAttribute('data-trx-effects-image-effect-strength') ) );

		// Effect-specific vars
		var wavesDirection = Math.max(0.0, Math.min(1.0, elm.getAttribute('data-trx-effects-image-effect-waves-direction') ) );

		// Curtains init
		var plane = null,
			parent = null,
			img = elm.querySelector( 'img' );

		if ( img ) {
			parent = img.parentNode;
			parent.classList.add('trx_effects_image_effects_holder');
			img.setAttribute('data-sampler', 'rippleTexture');
			if ( ! globalCanvas ) {
				curtains = create_canvas(parent);
				if ( curtains ) jQuery(elm).data('curtains', curtains);
			}
			if ( curtains ) {
				if ( ! permanentDrawing ) curtains.disableDrawing();
				plane = curtains.addPlane( parent, get_params( elm, img, parent ) );
				if ( plane ) {
					jQuery(elm).data('curtains-plane', plane);
					handle_plane( plane );
				}
			}
		}

		// Return plane params
		function get_params() {
			var vs = `

				#ifdef GL_ES
					precision mediump float;
				#endif

				// those are the mandatory attributes that the lib sets
				attribute vec3 aVertexPosition;
				attribute vec2 aTextureCoord;

				// those are mandatory uniforms that the lib sets and that contain our model view and projection matrix
				uniform mat4 uMVMatrix;
				uniform mat4 uPMatrix;

				// our texture matrix uniform
				uniform mat4 rippleTextureMatrix;

				// if you want to pass your vertex and texture coords to the fragment shader
				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;

				void main() {
					// get the vertex position from its attribute
					vec3 vertexPosition = aVertexPosition;
					
					// set its position based on projection and model view matrix
					gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

					// set the varying variables
					// thanks to the texture matrix we will be able to calculate accurate texture coords
					// so that our texture will always fit our plane without being distorted
					vTextureCoord = (rippleTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
					vVertexPosition = vertexPosition;
				}
			`;
			
			var fs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// get our varying variables
				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;

				// our texture sampler
				uniform sampler2D rippleTexture;

				// effect control vars declared inside our javascript
				uniform float uTime;			// time iterator to change waves position
				uniform float uEffectStrength;	// 10.0 - 50.0 - waves amplitude
				uniform float uWavesForce;		// 0.0 - 1.0 - fadeIn/fadeOut on mouse hover
				uniform float uWavesDirection;	// 0 - horizontal, 1 - vertical

				void main() {
					// get our texture coords
					vec2 textureCoord = vTextureCoord;

					// displace our pixels along both axis based on our time uniform and texture UVs
					// this will create a kind of water surface effect
					// try to comment a line or change the constants to see how it changes the effect
					// reminder : textures coords are ranging from 0.0 to 1.0 on both axis
					const float PI = 3.141592;

					textureCoord.x += (
										sin(textureCoord.x * 10.0 * ( 2.0 - uWavesDirection ) + ((uTime * (PI / 3.0)) * 0.031))
										+ sin(textureCoord.y * 10.0 * ( 2.0 - uWavesDirection ) + ((uTime * (PI / 2.489)) * 0.017))
										) / uEffectStrength / ( 2.5 + 1.5 * uWavesDirection ) * uWavesForce;	// * 0.0075;

					textureCoord.y += (
										sin(textureCoord.y * 20.0 / ( 2.0 - uWavesDirection ) + ((uTime * (PI / 2.023)) * 0.023))
										+ sin(textureCoord.x * 20.0 / ( 2.0 - uWavesDirection ) + ((uTime * (PI / 3.1254)) * 0.037))
										) / uEffectStrength / ( 2.5 + 1.5 * ( 1.0 - uWavesDirection ) ) * uWavesForce;	// * 0.0125;

					gl_FragColor = texture2D(rippleTexture, textureCoord);
				}
			`;

			return {
				vertexShader: vs,		// our vertex shader ID
				fragmentShader: fs,		// our fragment shader ID
//				widthSegments: 10,
//				heightSegments: 10,
				uniforms: {				// variables passed to shaders
					time: {
						name: "uTime",
						type: "1f",
						value: 0
					},
					effectStrength: {
						name: "uEffectStrength",
						type: "1f",
						value: effectStrength
					},
					wavesForce: {
						name: "uWavesForce",
						type: "1f",
						value: 0
					},
					wavesDirection: {
						name: "uWavesDirection",
						type: "1f",
						value: wavesDirection
					}
				}
			};
		}

		// handle plane
		function handle_plane( plane ) {
			plane
				.onLoading(function() {
//					console.log(plane.loadingManager.sourcesLoaded);
				})
				.onReady(function() {
//					console.log('Plane '+index+' of '+total+' is ready');
					// first render plane
					if ( ! permanentDrawing ) curtains.needRender();
					// init tweens
					plane.tweenForce = null;
					plane.tweenScale = null;
					// now that our plane is ready we can listen to mouse move event
					function mouse_move(e) {
						if ( ! mouseIn ) {
							mouse_enter();
						}
					}
					function mouse_enter() {
						if ( ! mouseIn ) {
							mouseIn = true;
							change_waves_force( 1 );
							change_scale( 1 );
						}
					}
					function mouse_leave() {
						if ( mouseIn ) {
							mouseIn = false;
							change_waves_force( 0 );
							change_scale( 0 );
						}
					}
					elm.addEventListener("mousemove",  mouse_move );
					elm.addEventListener("touchmove",  mouse_move );
					elm.addEventListener("mouseenter", mouse_enter );
					elm.addEventListener("touchstart", mouse_enter );
					elm.addEventListener("mouseleave", mouse_leave );
					elm.addEventListener("touchend",   mouse_leave );
				})
				.onRender(function() {
					plane.uniforms.time.value++;

				})
				.onAfterResize(function() {
//					console.log('Plane '+index+' of '+total+' is resized');
				});

			// Change wave force value
			function change_waves_force( to ) {
				if ( plane.tweenForce ) {
					tween_stop( plane.tweenForce );
				}
				plane.tweenForce = tween_value( {
					start: plane.uniforms.wavesForce.value,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							plane.uniforms.wavesForce.value = value;
						},
						onComplete: function() {
							plane.tweenForce = null;
						}
					}
				} );
			}

			// Change scale
			function change_scale( to ) {
				if ( plane.tweenScale ) {
					tween_stop( plane.tweenScale );
				}
				if ( ! permanentDrawing ) {
					curtains.enableDrawing();
				}
				plane.tweenScale = tween_value( {
					start: scaleFactor,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							scaleFactor = value;
							if ( scaleOnHover ) {
								plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
							}
						},
						onComplete: function() {
							plane.tweenScale = null;
							if ( ! permanentDrawing && to === 0 ) {
								curtains.disableDrawing();
							}
						}
					}
				} );
			}
		}
	};



	// Effect 'Ripple 2'
	//-------------------------------------------
	
	// Create plane.
	// Attention! All callbacks must be in a global scope!
	window.trx_effects_image_effects_callback_ripple2 = function( curtains_global, elm, index, total ) {

		var curtains = curtains_global ? curtains_global : null;

		// Common vars
		var mouseIn = false;

		var scaleOnHover = elm.getAttribute('data-trx-effects-image-effect-scale') > 0,
			scaleFactor = 0;

		var effectStrength = Math.max( 10.0, Math.min( 50.0, elm.getAttribute('data-trx-effects-image-effect-strength') ) );

		// Effect-specific vars
		var wavesDirection = Math.max(0.0, Math.min(1.0, elm.getAttribute('data-trx-effects-image-effect-waves-direction') ) );

		// Curtains init
		var plane = null,
			parent = null,
			img = elm.querySelector( 'img' );

		if ( img ) {
			parent = img.parentNode;
			parent.classList.add('trx_effects_image_effects_holder');
			img.setAttribute('data-sampler', 'ripple2Texture');
			var displacement_url = elm.getAttribute('data-trx-effects-image-effect-displacement');
			if ( displacement_url ) {
				var displacement_img = document.createElement("img");
				displacement_img.setAttribute('src', displacement_url);
				displacement_img.setAttribute('data-sampler', 'ripple2Displacement');
				displacement_img.classList.add('trx_effects_image_effects_ripple_displacement');
				parent.appendChild(displacement_img);
				$document.on('trx_effects_action_after_add_content', function(e, cont) {
					cont.find( '.trx_effects_image_effects_ripple_displacement' ).remove();
				});
			}
			if ( ! globalCanvas ) {
				curtains = create_canvas(parent);
				if ( curtains ) jQuery(elm).data('curtains', curtains);
			}
			if ( curtains ) {
				if ( ! permanentDrawing ) curtains.disableDrawing();
				plane = curtains.addPlane( parent, get_params( elm, img, parent ) );
				if ( plane ) {
					jQuery(elm).data('curtains-plane', plane);
					handle_plane( plane );
				}
			}
		}

		// Return plane params
		function get_params() {
			var vs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// default mandatory variables
				attribute vec3 aVertexPosition;
				attribute vec2 aTextureCoord;

				uniform mat4 uMVMatrix;
				uniform mat4 uPMatrix;

				// our texture matrices
				// notice how it matches our data-sampler attributes + "Matrix"
				uniform mat4 ripple2TextureMatrix;

				// varying variables
				varying vec3 vVertexPosition;

				// our displacement texture will use original texture coords attributes
				varying vec2 vDisplacementCoord;

				// our image will use texture coords based on their texture matrices
				varying vec2 vTextureCoord;

				// custom uniforms
				uniform float uTime;

				void main() {
					vec3 vertexPosition = aVertexPosition;

					gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

					// varying variables
					// texture coords attributes because we want our displacement texture to be contained
					vDisplacementCoord = aTextureCoord;
					// our image texture coords based on their texture matrices
					vTextureCoord = (ripple2TextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
					// vertex position as usual
					vVertexPosition = vertexPosition;
				}
			`;
			
			var fs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// all our varying variables
				varying vec3 vVertexPosition;
				varying vec2 vDisplacementCoord;
				varying vec2 vTextureCoord;

				// our textures samplers
				// notice how it matches our data-sampler attributes
				uniform sampler2D ripple2Texture;
				uniform sampler2D ripple2Displacement;

				// effect control vars declared inside our javascript
				uniform float uTime;			// time iterator to change waves position
				uniform float uEffectStrength;	// 10.0 - 50.0 - waves amplitude
				uniform float uWavesForce;		// 0.0 - 1.0 - fadeIn/fadeOut on mouse hover
				uniform float uWavesDirection;	// 0 - horizontal, 1 - vertical

				void main( void ) {

					// our displacement texture
					vec2 displacementCoords = vDisplacementCoord;

					displacementCoords = vec2( mod(displacementCoords.x - (1.0 - uWavesDirection) * uTime / ( 400.0 + uEffectStrength * 5.0 ), 1.0),
											   mod(displacementCoords.y - uWavesDirection * uTime / ( 600.0 + uEffectStrength * 5.0 ), 1.0)
											);
					vec4 displacementTexture = texture2D(ripple2Displacement, displacementCoords);

					// image texture
					vec2 textureCoords = vTextureCoord;

					// displace our pixels along both axis based on our time uniform and texture UVs
					// this will create a kind of water surface effect
					// try to comment a line or change the constants to see how it changes the effect
					// reminder : textures coords are ranging from 0.0 to 1.0 on both axis
					const float PI = 3.141592;

					textureCoords.x += 1.0 / uEffectStrength / ( 2.5 + 1.5 * uWavesDirection ) * uWavesForce * displacementTexture.r;

					textureCoords.y -= 1.0 / uEffectStrength / ( 2.0 + 1.5 * ( 1.0 - uWavesDirection ) ) * uWavesForce * displacementTexture.r;

					vec4 finalColor = texture2D(ripple2Texture, textureCoords);

					// handling premultiplied alpha and apply displacement
					finalColor = vec4(finalColor.rgb * finalColor.a, finalColor.a);

					// apply our shader
					gl_FragColor = finalColor;
				}
			`;

			return {
				vertexShader: vs,		// our vertex shader ID
				fragmentShader: fs,		// our fragment shader ID
//				widthSegments: 10,
//				heightSegments: 10,
				imageCover: false,		// our displacement texture has to fit the plane
				uniforms: {				// variables passed to shaders
					time: {
						name: "uTime",
						type: "1f",
						value: 0
					},
					effectStrength: {
						name: "uEffectStrength",
						type: "1f",
						value: effectStrength
					},
					wavesForce: {
						name: "uWavesForce",
						type: "1f",
						value: 0
					},
					wavesDirection: {
						name: "uWavesDirection",
						type: "1f",
						value: wavesDirection
					}
				}
			};
		}

		// handle plane
		function handle_plane( plane ) {
			plane
				.onLoading(function() {
//					console.log(plane.loadingManager.sourcesLoaded);
				})
				.onReady(function() {
//					console.log('Plane '+index+' of '+total+' is ready');
					// first render plane
					if ( ! permanentDrawing ) curtains.needRender();
					// init tweens
					plane.tweenForce = null;
					plane.tweenScale = null;
					// now that our plane is ready we can listen to mouse move event
					function mouse_move(e) {
						if ( ! mouseIn ) {
							mouse_enter();
						}
					}
					function mouse_enter() {
						if ( ! mouseIn ) {
							mouseIn = true;
							change_waves_force( 1 );
							change_scale( 1 );
						}
					}
					function mouse_leave() {
						if ( mouseIn ) {
							mouseIn = false;
							change_waves_force( 0 );
							change_scale( 0 );
						}
					}
					elm.addEventListener("mousemove",  mouse_move );
					elm.addEventListener("touchmove",  mouse_move );
					elm.addEventListener("mouseenter", mouse_enter );
					elm.addEventListener("touchstart", mouse_enter );
					elm.addEventListener("mouseleave", mouse_leave );
					elm.addEventListener("touchend",   mouse_leave );
				})
				.onRender(function() {
					plane.uniforms.time.value++;

				})
				.onAfterResize(function() {
//					console.log('Plane '+index+' of '+total+' is resized');
				});

			// Change wave force value
			function change_waves_force( to ) {
				if ( plane.tweenForce ) {
					tween_stop( plane.tweenForce );
				}
				plane.tweenForce = tween_value( {
					start: plane.uniforms.wavesForce.value,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							plane.uniforms.wavesForce.value = value;
						},
						onComplete: function() {
							plane.tweenForce = null;
						}
					}
				} );
			}

			// Change scale
			function change_scale( to ) {
				if ( plane.tweenScale ) {
					tween_stop( plane.tweenScale );
				}
				if ( ! permanentDrawing ) {
					curtains.enableDrawing();
				}
				plane.tweenScale = tween_value( {
					start: scaleFactor,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							scaleFactor = value;
							if ( scaleOnHover ) {
								plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
							}
						},
						onComplete: function() {
							plane.tweenScale = null;
							if ( ! permanentDrawing && to === 0 ) {
								curtains.disableDrawing();
							}
						}
					}
				} );
			}
		}
	};



	// Effect 'Swap'
	//-------------------------------------------
	
	// Create plane.
	// Attention! All callbacks must be in a global scope!
	window.trx_effects_image_effects_callback_swap = function( curtains_global, elm, index, total ) {

		var curtains = curtains_global ? curtains_global : null;

		// Common vars
		var mouseIn = false;

		var scaleOnHover = elm.getAttribute('data-trx-effects-image-effect-scale') > 0,
			scaleFactor = 0;

		var activeImage = 0;

		// Curtains init
		var plane = null,
			parent = null,
			img = elm.querySelector( 'img' );

		if ( img ) {
			parent = img.parentNode;
			parent.classList.add('trx_effects_image_effects_holder');
			img.setAttribute('data-sampler', 'swapTexture');
			var swap_url = elm.getAttribute('data-trx-effects-image-effect-swap-image');
			if ( swap_url ) {
				var swap_img = document.createElement("img");
				swap_img.setAttribute('src', swap_url);
				swap_img.setAttribute('data-sampler', 'swap2Texture');
				swap_img.classList.add('trx_effects_image_effects_swap_image');
				parent.appendChild(swap_img);
				$document.on('trx_effects_action_after_add_content', function(e, cont) {
					cont.find( '.trx_effects_image_effects_swap_image' ).remove();
				});
			}
			var displacement_url = elm.getAttribute('data-trx-effects-image-effect-displacement');
			if ( displacement_url ) {
				var displacement_img = document.createElement("img");
				displacement_img.setAttribute('src', displacement_url);
				displacement_img.setAttribute('data-sampler', 'swapDisplacement');
				displacement_img.classList.add('trx_effects_image_effects_swap_displacement');
				parent.appendChild(displacement_img);
				$document.on('trx_effects_action_after_add_content', function(e, cont) {
					cont.find( '.trx_effects_image_effects_swap_displacement' ).remove();
				});
			}
			if ( ! globalCanvas ) {
				curtains = create_canvas(parent);
				if ( curtains ) jQuery(elm).data('curtains', curtains);
			}
			if ( curtains ) {
				if ( ! permanentDrawing ) curtains.disableDrawing();
				plane = curtains.addPlane( parent, get_params( elm, img, parent ) );
				if ( plane ) {
					jQuery(elm).data('curtains-plane', plane);
					handle_plane( plane );
				}
			}
		}

		// Return plane params
		function get_params() {
			var vs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// default mandatory variables
				attribute vec3 aVertexPosition;
				attribute vec2 aTextureCoord;

				uniform mat4 uMVMatrix;
				uniform mat4 uPMatrix;

				// our texture matrices
				// notice how it matches our data-sampler attributes + "Matrix"
				uniform mat4 swapTextureMatrix;
				uniform mat4 swap2TextureMatrix;

				// varying variables
				varying vec3 vVertexPosition;

				// our displacement texture will use original texture coords attributes
				varying vec2 vTextureCoord;

				// our image will use texture coords based on their texture matrices
				varying vec2 vSwapTextureCoord;
				varying vec2 vSwap2TextureCoord;

				// custom uniforms
				uniform float uTime;

				void main() {
					vec3 vertexPosition = aVertexPosition;

					gl_Position = uPMatrix * uMVMatrix * vec4(vertexPosition, 1.0);

					// varying variables
					// texture coords attributes because we want our displacement texture to be contained
					vTextureCoord = aTextureCoord;
					// our image texture coords based on their texture matrices
					vSwapTextureCoord = (swapTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
					vSwap2TextureCoord = (swap2TextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
					// vertex position as usual
					vVertexPosition = vertexPosition;
				}
			`;
			
			var fs = `
				#ifdef GL_ES
					precision mediump float;
				#endif

				// all our varying variables
				varying vec3 vVertexPosition;
				varying vec2 vTextureCoord;
				varying vec2 vSwapTextureCoord;
				varying vec2 vSwap2TextureCoord;

				// custom uniforms
				uniform float uTime;

				// our textures samplers
				// notice how it matches our data-sampler attributes
				uniform sampler2D swapTexture;
				uniform sampler2D swap2Texture;
				uniform sampler2D swapDisplacement;

				void main( void ) {
					// our texture coords
					vec2 textureCoords = vTextureCoord;

					// our displacement texture
					vec4 displacementTexture = texture2D(swapDisplacement, textureCoords);

					// our displacement factor is a float varying from 1 to 0 based on the timer
					float displacementFactor = 1.0 - (cos(uTime / (60.0 / 3.141592)) + 1.0) / 2.0;

					// the effect factor will tell which way we want to displace our pixels
					// the farther from the center of the videos, the stronger it will be
					vec2 effectFactor = vec2((textureCoords.x - 0.5) * 0.75, (textureCoords.y - 0.5) * 0.75);

					// calculate our displaced coordinates of the first video
					vec2 firstDisplacementCoords = vec2(vSwapTextureCoord.x - displacementFactor * (displacementTexture.r * effectFactor.x), vSwapTextureCoord.y- displacementFactor * (displacementTexture.r * effectFactor.y));
					// opposite displacement effect on the second video
					vec2 secondDisplacementCoords = vec2(vSwap2TextureCoord.x - (1.0 - displacementFactor) * (displacementTexture.r * effectFactor.x), vSwap2TextureCoord.y - (1.0 - displacementFactor) * (displacementTexture.r * effectFactor.y));

					// apply the textures
					vec4 firstDistortedColor = texture2D(swapTexture, firstDisplacementCoords);
					vec4 secondDistortedColor = texture2D(swap2Texture, secondDisplacementCoords);

					// blend both textures based on our displacement factor
					vec4 finalColor = mix(firstDistortedColor, secondDistortedColor, displacementFactor);

					// handling premultiplied alpha
					finalColor = vec4(finalColor.rgb * finalColor.a, finalColor.a);

					// apply our shader
					gl_FragColor = finalColor;
				}
			`;

			return {
				vertexShader: vs,		// our vertex shader ID
				fragmentShader: fs,		// our fragment shader ID
//				widthSegments: 10,
//				heightSegments: 10,
				imageCover: false,		// our displacement texture has to fit the plane
				uniforms: {				// variables passed to shaders
					time: {
						name: "uTime",
						type: "1f",
						value: 0
					}
				}
			};
		}

		// handle plane
		function handle_plane( plane ) {
			plane
				.onLoading(function() {
//					console.log(plane.loadingManager.sourcesLoaded);
				})
				.onReady(function() {
//					console.log('Plane '+index+' of '+total+' is ready');
					// first render plane
					if ( ! permanentDrawing ) curtains.needRender();
					// init tweens
					plane.tweenForce = null;
					plane.tweenScale = null;
					// now that our plane is ready we can listen to mouse move event
					function mouse_move(e) {
						if ( ! mouseIn ) {
							mouse_enter();
						}
					}
					function mouse_enter() {
						if ( ! mouseIn ) {
							mouseIn = true;
							activeImage = 1;
							change_scale( 1 );
						}
					}
					function mouse_leave() {
						if ( mouseIn ) {
							mouseIn = false;
							activeImage = 0;
							change_scale( 0 );
						}
					}
					elm.addEventListener("mousemove",  mouse_move );
					elm.addEventListener("touchmove",  mouse_move );
					elm.addEventListener("mouseenter", mouse_enter );
					elm.addEventListener("touchstart", mouse_enter );
					elm.addEventListener("mouseleave", mouse_leave );
					elm.addEventListener("touchend",   mouse_leave );
				})
				.onRender(function() {
					plane.uniforms.time.value = activeImage == 1 ? Math.min(60, plane.uniforms.time.value + 1) : Math.max(0, plane.uniforms.time.value - 1);

				})
				.onAfterResize(function() {
//					console.log('Plane '+index+' of '+total+' is resized');
				});

			// Change scale
			function change_scale( to ) {
				if ( plane.tweenScale ) {
					tween_stop( plane.tweenScale );
				}
				if ( ! permanentDrawing ) {
					curtains.enableDrawing();
				}
				plane.tweenScale = tween_value( {
					start: scaleFactor,
					end: to,
					time: 1.25,
					callbacks: {
						onUpdate: function(value) {
							scaleFactor = value;
							if ( scaleOnHover ) {
								plane.textures && plane.textures[0].setScale(1 + value / 12, 1 + value / 12);
							}
						},
						onComplete: function() {
							plane.tweenScale = null;
							if ( ! permanentDrawing ) {
								curtains.disableDrawing();
							}
						}
					}
				} );
			}
		}
	};

})();