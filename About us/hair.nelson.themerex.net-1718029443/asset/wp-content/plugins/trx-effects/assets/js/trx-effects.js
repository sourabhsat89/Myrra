/**
 * JS init
 *
 * @since v1.0
 */

/* global jQuery:false */
/* global TRX_EFFECTS_STORAGE:false */

(function() {

	"use strict";

	var $window   = jQuery( window ),
		$document = jQuery( document ),
		$body;

	$document.ready( function() {
		$body = jQuery('body');

		// Intersection observer init
		window.trx_effects_intersection_observer = new TrxEffectsIntersectionObserver();

		// Trigger internal event 'trx_effects_action_init' on page init
		$document.trigger( 'trx_effects_action_init' );
	} );

	// Page init actions
	$document.on( 'trx_effects_action_init', function() {
		// Trigger internal event 'trx_effects_action_init_hidden_elements' on page init
		$document.trigger( 'trx_effects_action_init_hidden_elements', [ $body ] );
	} );

	// Trigger internal event 'trx_effects_action_init_hidden_elements' on any module is added in the Elementor Editor
	$window.on( 'elementor/frontend/init', function() {
		if ( typeof window.elementorFrontend !== 'undefined'
			&& typeof window.elementorFrontend.hooks !== 'undefined'
			&& elementorFrontend.isEditMode()
		) {
			// Prevent many calls on first init elements - trottle with 2.5s is used
			var init_hidden_elements_immediately = false,

				// Run this function after 2.5s after last call
				init_hidden_elements_immediately_start = trx_effects_throttle( function() {
					init_hidden_elements_immediately = true;
					init_hidden_elements( $body );
				}, 2500, true ),

				// Run after any element is added
				init_hidden_elements = function( $cont ) {
					// Init hidden elements (widgets, shortcodes) when its added to the preview area
					$document.trigger( 'trx_effects_action_init_hidden_elements', [$cont] );
				};

			// Init elements after creation
			elementorFrontend.hooks.addAction( 'frontend/element_ready/global', function( $cont ) {
				if ( init_hidden_elements_immediately ) {
					init_hidden_elements( $cont );
				} else {
					init_hidden_elements_immediately_start();
				}
			} );
		}
	} );

	// Trigger internal event 'trx_effects_action_got_ajax_response' on 'ajaxComplete'
	$document.on( 'ajaxComplete', function(e) {
		// Trigger event after timeout to allow other scripts add elements on the page
		setTimeout( function() {
			$document.trigger( 'trx_effects_action_got_ajax_response' );
		}, 100 );
	} );

	// Trigger internal event 'trx_effects_action_before_remove_content' on 'action.before_remove_content'
	$document.on( 'action.before_remove_content', function( e, $cont ) {
		$document.trigger( 'trx_effects_action_before_remove_content', [$cont] );
	} );

	// Trigger internal event 'trx_effects_action_after_add_content' on 'action.after_add_content'
	$document.on( 'action.after_add_content', function( e, $cont ) {
		$document.trigger( 'trx_effects_action_after_add_content', [$cont] );
	} );

	// Trigger internal event 'trx_effects_action_build_page_toc' on 'action.build_page_toc'
	$document.on( 'action.build_page_toc', function( e ) {
		$document.trigger( 'trx_effects_action_build_page_toc' );
	} );



	// Show on scroll object
	//----------------------------------
	var $show_on_scroll     = false;
	var _window_height      = $window.height(),
		_window_scroll_top  = $window.scrollTop();

	// Add items to observer after all other handlers finished
	setTimeout( function() {
		$document.on( 'trx_effects_action_init_hidden_elements trx_effects_action_got_ajax_response', function( e, $cont ) {
			$show_on_scroll = jQuery('.trx_effects_show_on_scroll');
			if ( $show_on_scroll.length > 0 ) {
				trx_effects_intersection_observer.add( $show_on_scroll );
				// Do first call
				trx_effects_intersection_observer.on_scroll();
				trx_effects_show_on_scroll();
			}
		} );
	}, 10 );

	// Show "on scroll" blocks
	$window.on( 'scroll', trx_effects_show_on_scroll );

	function trx_effects_show_on_scroll() {
		_window_height      = $window.height();
		_window_scroll_top  = $window.scrollTop();
		if ( $show_on_scroll ) {
			$show_on_scroll.each( function() {
				var item = jQuery(this);
				if ( item.hasClass( 'trx_effects_in_viewport' ) ){
					if ( item.offset().top < _window_scroll_top + _window_height * 0.75 ) {
						item.removeClass( 'trx_effects_show_on_scroll' ).addClass( 'trx_effects_showed_on_scroll' );
						trx_effects_intersection_observer.remove( item );
						$show_on_scroll = jQuery('.trx_effects_show_on_scroll');
					}
				}
			} );
		}
	}



	// Intersection observer
	//----------------------------------
	var TrxEffectsIntersectionObserver = function() {
		this.observer = false;
		this.items = {};

		if ( typeof IntersectionObserver != 'undefined' ) {
			// Create observer
			var intersection_observer = this;
			this.observer = new IntersectionObserver( function( entries ) {
				entries.forEach( function( entry ) {
					intersection_observer.in_out( jQuery( entry.target ), entry.isIntersecting || entry.intersectionRatio > 0 ? 'in' : 'out', entry );
				});
			}, {
				root: null,			// avoiding 'root' or setting it to 'null' sets it to default value: viewport
				rootMargin: '0px',	// increase (if positive) or decrease (if negative) root area
				threshold: 0		// 0.0 - 1.0: 0.0 - fired when top of the object enter in the viewport
									//            0.5 - fired when half of the object enter in the viewport
									//            1.0 - fired when the whole object enter in the viewport
			} );
		} else {
			// Emulate IntersectionObserver behaviour on scroll event
			$window.on( 'scroll', this.on_scroll );
		}
	};

	// Emulate IntersectionObserver behaviour on scroll event
	TrxEffectsIntersectionObserver.prototype.on_scroll = function() {
		for ( var i in this.items ) {
			if ( ! this.items[i] || this.items[i].length === 0 ) {
				continue;
			}
			var item = this.items[i],
				item_top = item.offset().top,
				item_height = item.height();
			this.in_out( item, item_top + item_height > _window_scroll_top && item_top < _window_scroll_top + _window_height ? 'in' : 'out' );
		}
	};

	// Change state of the entry
	TrxEffectsIntersectionObserver.prototype.in_out = function( item, state, entry ) {
		var callback = '';
		if ( state == 'in' ) {
			if ( ! item.hasClass( 'trx_effects_in_viewport' ) ) {
				item.addClass( 'trx_effects_in_viewport' );
				callback = item.data('trx-effects-intersection-callback');
				if ( callback ) {
					callback( item, true, entry );
				}
			}
		} else {
			if ( item.hasClass( 'trx_effects_in_viewport' ) ) {
				item.removeClass( 'trx_effects_in_viewport' );
				callback = item.data('trx-effects-intersection-callback');
				if ( callback ) {
					callback( item, false, entry );
				}
			}
		}
	};

	// Add elements to the observer
	TrxEffectsIntersectionObserver.prototype.add = function( items, callback ) {
		var intersection_observer = this;
		items.each( function() {
			var $self = jQuery( this ),
				id = $self.attr( 'id' );
			if ( ! $self.hasClass( 'trx_effects_intersection_inited' ) ) {
				if ( ! id ) {
					id = 'io-' + ( '' + Math.random() ).replace('.', '');
					$self.attr( 'id', id );
				}
				$self.addClass( 'trx_effects_intersection_inited' );
				if ( callback ) {
					$self.data( 'trx-effects-intersection-callback', callback );
				}
				intersection_observer.items[id] = $self;
				if ( intersection_observer.observer ) {
					intersection_observer.observer.observe( $self.get(0) );
				}
			}
		} );
	};

	// Remove elements from the observer
	TrxEffectsIntersectionObserver.prototype.remove = function( items ) {
		var intersection_observer = this;
		items.each( function() {
			var $self = jQuery( this ),
				id = $self.attr( 'id' );
			if ( $self.hasClass( 'trx_effects_intersection_inited' ) ) {
				$self.removeClass( 'trx_effects_intersection_inited' );
				delete intersection_observer.items[id];
				if ( intersection_observer.observer ) {
					intersection_observer.observer.unobserve( $self.get(0) );
				}
			}
		} );
	};


	// Elementor utils
	//--------------------------------------------------
	window.trx_effects_elementor_get_settings_by_cid = function( cid, keys ) {
		if ( typeof elementorFrontend != 'undefined' ) {
			var settings = elementorFrontend.config.elements.data[cid].attributes;
			if ( keys ) {
				var params = {};
				for ( var s in settings ) {
					for ( var i = 0; i < keys.length; i++ ) {
						if ( s.indexOf( keys[i] ) === 0 ) {
							// If current field is repeater
							if ( typeof settings[s] == 'object' && settings[s].hasOwnProperty('models') ) {
								var tmp = [];
								for ( var m = 0; m < settings[s]['models'].length; m++ ) {
									tmp.push( settings[s]['models'][m]['attributes'] );
								}
								params[s] = tmp;

							// Else it a plain field
							} else {
								params[s] = settings[s];
							}
							break;
						}
					}
				}
				return params;
			}
			return settings;
		}
		return false;
	};


	// CSS transitions and animations listener
	//--------------------------------------------------
	var support            = {
								transitions: window.Modernizr ? Modernizr.csstransitions : false,
								animations: window.Modernizr ? Modernizr.cssanimations : false
								},
		transEndEventNames = { 'WebkitTransition': 'webkitTransitionEnd', 'MozTransition': 'transitionend', 'OTransition': 'oTransitionEnd', 'msTransition': 'MSTransitionEnd', 'transition': 'transitionend' },
		transEndEventName  = window.Modernizr ? transEndEventNames[ Modernizr.prefixed( 'transition' ) ] : '',
		animaEndEventNames = { 'WebkitAnimation': 'webkitAnimationEnd', 'MozAnimation': 'animationend', 'OAnimation': 'oAnimationEnd', 'msAnimation': 'MSAnimationEnd', 'animation': 'animationend' },
		animaEndEventName  = window.Modernizr ? animaEndEventNames[ Modernizr.prefixed( 'animation' ) ] : '';
	window.TrxEffectsOnEndTransition = function( el, callback, timeout ) {
		var onEndCallbackFn = function( e ) {
			if ( support.transitions ) {
				if ( e.target != this ) {
					return;
				}
				this.removeEventListener( transEndEventName, onEndCallbackFn );
			}
			if ( callback && typeof callback === 'function' ) {
				callback.call( this );
			}
		};
		if ( support.transitions ) {
			el.addEventListener( transEndEventName, onEndCallbackFn, false );
		} else {
			setTimeout( function() {
				if ( callback && typeof callback === 'function' ) {
					callback.call( this );
				}
			}, timeout || 0 );
		}
	};

	window.TrxEffectsOnEndAnimation = function( el, callback, timeout ) {
		var onEndCallbackFn = function( e ) {
			if ( support.animations ) {
				if ( e.target != this ) {
					return;
				}
				this.removeEventListener( animaEndEventName, onEndCallbackFn );
			}
			if ( callback && typeof callback === 'function' ) {
				callback.call( this );
			}
		};
		if ( support.animations ) {
			el.addEventListener( animaEndEventName, onEndCallbackFn, false );
		} else {
			setTimeout( function() {
				if ( callback && typeof callback === 'function' ) {
					callback.call( this );
				}
			}, timeout || 0 );
		}
	};

})();