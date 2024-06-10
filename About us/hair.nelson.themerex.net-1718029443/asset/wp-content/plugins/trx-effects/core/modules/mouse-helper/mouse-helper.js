/* global jQuery:false */

(function() {

	"use strict";

	var $window   = jQuery( window ),
		$document = jQuery( document );

	$document.on( 'trx_effects_action_init', function() {

		var requestAnimationFrame = window.requestAnimationFrame
									|| window.webkitRequestAnimationFrame
									|| window.mozRequestAnimationFrame
									|| window.oRequestAnimationFrame
									|| window.msRequestAnimationFrame
									|| null;

		var mouseX = null, mouseY = null,
			realX  = null, realY  = null,
			destX  = 0,    destY  = 0;

		var mouse_helper_timeout  = 0,
			mouse_helper_target   = null,
			mouse_helper_last_target = null,
			mouse_helper_action      = '',
			mouse_helper_last_action = '',
			mouse_helper_blend_mode  = '',
			mouse_helper_color    = '',
			mouse_helper_bg_color = '',
			mouse_helper_bd_color = '',
			mouse_helper_callback = '',
			mouse_helper_axis     = 'xy',
			mouse_helper_delay    = TRX_EFFECTS_STORAGE['mouse_helper_delay'];

		var _window_height        = $window.height(),
			_window_width         = $window.width(),
			_window_scroll_top    = $window.scrollTop(),
			_window_scroll_left   = $window.scrollLeft(),
			$body                 = jQuery( 'body' ),
			$mouse_helper         = jQuery('.trx_effects_mouse_helper');

		var $mouse_helper_targets,
			$mouse_helper_magnets;

		// Update links and values after the new post added
		$document.on( 'trx_effects_action_got_ajax_response', update_jquery_links );
		$document.on( 'trx_effects_action_init_hidden_elements', update_jquery_links );
		var first_run = true;
		function update_jquery_links(e) {
			if ( first_run && e && e.namespace == 'init_hidden_elements' ) {
				first_run = false;
				return; 
			}
			$mouse_helper_targets = jQuery( '[data-trx-effects-mouse-helper]' );
			$mouse_helper_magnets = jQuery( '[data-trx-effects-mouse-helper-magnet]:not([data-trx-effects-mouse-helper-magnet="0"])' );
		}
		update_jquery_links();

		// Update global values
		$window.on( 'scroll', function() {
			_window_scroll_top = $window.scrollTop();
		} );
		$window.on( 'resize', function() {
			_window_height      = $window.height();
			_window_width       = $window.width();
			_window_scroll_top  = $window.scrollTop();
			_window_scroll_left = $window.scrollLeft();
		} );


		// Init Mouse helper
		if ( TRX_EFFECTS_STORAGE['mouse_helper'] > 0 && $mouse_helper.length > 0 && requestAnimationFrame ) {

			mouse_helper_blend_mode = $mouse_helper.css( 'mix-blend-mode' );
			mouse_helper_color      = $mouse_helper.css( 'color' );
			mouse_helper_bg_color   = $mouse_helper.css( 'background-color' );
			mouse_helper_bd_color   = $mouse_helper.css( 'border-color' );

			$document
				.on( 'mousemove', function(e) {
					mouse_helper_get_state(e);
					if ( mouse_helper_callback && typeof window[mouse_helper_callback] == 'function' ) {
						window[mouse_helper_callback]( 'mousemove', $mouse_helper, mouse_helper_target, e );
					} else if ( typeof window['trx_effects_mouse_helper_callback_' + mouse_helper_action] == 'function' ) {
						window['trx_effects_mouse_helper_callback_' + mouse_helper_action]( 'mousemove', $mouse_helper, mouse_helper_target, e );
					}
					if ( mouse_helper_action == 'highlight' && mouse_helper_target ) {
						var targetOffset = mouse_helper_target.offset(),
							targetX = targetOffset.left - _window_scroll_left,
							targetY = targetOffset.top - _window_scroll_top,
							size = parseFloat(mouse_helper_target.css('background-size').split(' ')[0])/2;
						mouse_helper_target.css('background-position', (mouseX-targetX-size)+'px '+(mouseY-targetY-size)+'px');
					}
					if ( _window_width >= TRX_EFFECTS_STORAGE['mobile_breakpoint_mousehelper_off'] ) {
						if ( mouse_helper_delay < 2 ) {
							destX = mouseX;
							destY = mouseY;
							$mouse_helper.css("transform", "translate(" + destX + "px," + destY + "px)");
						}
						if ( mouseX > _window_width - 100 ) {
							if ( ! $mouse_helper.hasClass( 'trx_effects_mouse_helper_left' ) ) {
								$mouse_helper.addClass( 'trx_effects_mouse_helper_left' );
							}
						} else {
							if ( $mouse_helper.hasClass( 'trx_effects_mouse_helper_left' ) ) {
								$mouse_helper.removeClass( 'trx_effects_mouse_helper_left' );
							}
						}
						if ( mouseY > _window_height - 100 ) {
							if ( ! $mouse_helper.hasClass( 'trx_effects_mouse_helper_top' ) ) {
								$mouse_helper.addClass( 'trx_effects_mouse_helper_top' );
							}
						} else {
							if ( $mouse_helper.hasClass( 'trx_effects_mouse_helper_top' ) ) {
								$mouse_helper.removeClass( 'trx_effects_mouse_helper_top' );
							}
						}
						// Check magnets
						mouse_helper_check_magnets();
					}
				} )

				.on("mouseenter", '[data-trx-effects-mouse-helper]', function(e) {
					var $self = jQuery(this).addClass('trx_effects_mouse_helper_over');
					mouse_helper_target = mouse_helper_last_target = $self;
					mouse_helper_action = mouse_helper_last_action = $self.data( 'trx-effects-mouse-helper' );
					if ( _window_width >= TRX_EFFECTS_STORAGE['mobile_breakpoint_mousehelper_off'] ) {
						mouse_helper_reset();
						if ( mouse_helper_timeout ) {
							clearTimeout( mouse_helper_timeout );
							mouse_helper_timeout = 0;
						}
					}
					mouse_helper_callback = $self.data( 'trx-effects-mouse-helper-callback' );
					if ( mouse_helper_callback === undefined ) {
						mouse_helper_callback = '';
					}
					if ( mouse_helper_callback && typeof window[mouse_helper_callback] == 'function' ) {
						window[mouse_helper_callback]( 'mouseenter', $mouse_helper, $self, e );
					} else if ( typeof window['trx_effects_mouse_helper_callback_' + mouse_helper_action] == 'function' ) {
						window['trx_effects_mouse_helper_callback_' + mouse_helper_action]( 'mouseenter', $mouse_helper, $self, e );
					}
					mouse_helper_axis = $self.data( 'trx-effects-mouse-helper-axis' );
					if ( mouse_helper_axis === undefined ) {
						mouse_helper_axis = 'xy';
					}
					mouse_helper_delay = $self.data( 'trx-effects-mouse-helper-delay' );
					if ( mouse_helper_delay === undefined ) {
						mouse_helper_delay = TRX_EFFECTS_STORAGE['mouse_helper_delay'];
					}
					
					mouse_helper_get_state(e);

					if ( _window_width >= TRX_EFFECTS_STORAGE['mobile_breakpoint_mousehelper_off'] ) {
						// Centered
						var pos = TRX_EFFECTS_STORAGE['mouse_helper_centered'] > 0 || $self.data("trx-effects-mouse-helper-centered") > 0 || '';
						if ( pos > 0 ) {
							$mouse_helper
								.addClass( 'trx_effects_mouse_helper_centered' );
						}
						// Overlay mode
						var mode = $self.data("trx-effects-mouse-helper-mode") || '';
						if ( mode ) {
							$mouse_helper.css( 'mix-blend-mode', mode );
						}
						// Text color
						var color = $self.data("trx-effects-mouse-helper-color") || '';
						if ( color ) {
							$mouse_helper.css( 'color', color );
						}
						// Background color
						var bg_color = $self.data("trx-effects-mouse-helper-bg-color") || '';
						if ( bg_color ) {
							$mouse_helper.css( 'background-color', bg_color );
						}
						// Border color
						var bd_color = $self.data("trx-effects-mouse-helper-bd-color") || '';
						if ( bd_color ) {
							$mouse_helper.css( 'border-color', bd_color );
						}
						// Add image
						var img = $self.data("trx-effects-mouse-helper-image") || '';
						if ( img ) {
							$mouse_helper
								.find('.trx_effects_mouse_helper_image').remove().end()
								.append( '<span class="trx_effects_mouse_helper_image" style="background-image:url(' + img + ');"></span>' )
								.addClass( "trx_effects_mouse_helper_with_image");
						}
						// Add icon
						var icon = $self.data("trx-effects-mouse-helper-icon") || '';
						if ( icon ) {
							var icon_color = $self.data("trx-effects-mouse-helper-icon-color") || '',
								icon_size = $self.data("trx-effects-mouse-helper-icon-size") || '';
							$mouse_helper
								.find('.trx_effects_mouse_helper_icon').remove().end()
								.append( '<span class="trx_effects_mouse_helper_icon ' + icon + '"'
												+ ' style="'
													+ ( icon_color ? 'color: ' + icon_color + ';' : '' )
													+ ( icon_size ? 'font-size: ' + icon_size + 'em;' : '' )
												+ '"'
											+ '></span>' )
								.addClass( 'trx_effects_mouse_helper_with_icon' );
						}
						// Add text
						var text = $self.data("trx-effects-mouse-helper-text") || '',
							text_round = $self.data("trx-effects-mouse-helper-text-round") > 0 || false,
							text_size = $self.data("trx-effects-mouse-helper-text-size") || '';
						if ( text ) {
							$mouse_helper
								.find('.trx_effects_mouse_helper_text').remove().end()
								.append( '<span class="trx_effects_mouse_helper_text' + ( text_round ? ' trx_effects_mouse_helper_text_round' : '' ) + '"'
											+ ( text_size ? ' style="font-size:' + text_size + 'em;"' : '' )
											+ '>'
												+ ( text_round ? trx_effects_wrap_chars( text, '<span class="trx_effects_mouse_helper_text_round_item">', '</span>' ) : text )
											+ '</span>' )
								.addClass( 'trx_effects_mouse_helper_with_text' );
							if ( text_round ) {
								setTimeout( function() {
									var text = $mouse_helper.find( '.trx_effects_mouse_helper_text' ),
										items = text.find( '.trx_effects_mouse_helper_text_round_item' );
									if ( items.length > 0) {
										var r = text.width() / 2,
											a = 0,
											hide = false;
										items.each( function( idx ) {
											if ( hide ) {
												items.eq(idx).hide();
											} else {
												if ( a >= 340 ) {	// If fill whole round - hide rest chars and replace its with '...'
													items.eq(idx).html('&hellip;');
													hide = true;
												}
												var x = r + r * Math.sin( a / 180 * Math.PI ),
													y = r - r * Math.cos( a / 180 * Math.PI );
												items.eq(idx).css( {
													'transform': 'rotate(' + a + 'deg)',
													'left': x + 'px',
													'top':  y + 'px'
												} );
												a += 2 * Math.asin( ( items.eq(idx).width() + 3 ) / ( 2 * r ) ) * 180 / Math.PI;
											}
										} );
									}
								}, 350);
							}
						}
						// Add custom HTML code
						var layout = $self.data("trx-effects-mouse-helper-layout") || '';
						if ( layout ) {
							$mouse_helper
								.find('.trx_effects_mouse_helper_layout').remove().end()
								.append( '<span class="trx_effects_mouse_helper_layout">' + layout + '</span>' )
								.addClass( 'trx_effects_mouse_helper_with_layout' );
						}
						// Set 'active' and 'action' classes
						$mouse_helper.addClass( "trx_effects_mouse_helper_active trx_effects_mouse_helper_action_" + mouse_helper_action);
					}
				} )

				.on("mouseleave", '[data-trx-effects-mouse-helper]', function(e) {
					if ( mouse_helper_callback && typeof window[mouse_helper_callback] == 'function' ) {
						window[mouse_helper_callback]( 'mouseleave', $mouse_helper, mouse_helper_target, e );
						mouse_helper_callback = '';
					} else if ( typeof window['trx_effects_mouse_helper_callback_' + mouse_helper_action] == 'function' ) {
						window['trx_effects_mouse_helper_callback_' + mouse_helper_action]( 'mouseleave', $mouse_helper, mouse_helper_target, e );
					}
					$mouse_helper.removeClass( 'trx_effects_mouse_helper_click'
												+ ' trx_effects_mouse_helper_action_' + mouse_helper_action
												);
					if ( mouse_helper_target ) {
						mouse_helper_target.removeClass('trx_effects_mouse_helper_over');
					}
					mouse_helper_target = null;
					mouse_helper_action = '';
					mouse_helper_axis = 'xy';
					mouse_helper_delay = TRX_EFFECTS_STORAGE['mouse_helper_delay'];
					if ( _window_width >= TRX_EFFECTS_STORAGE['mobile_breakpoint_mousehelper_off'] ) {
						mouse_helper_timeout = setTimeout( function() {
							mouse_helper_reset();
							}, 300 );
					}
					if ( e.relatedTarget ) {
						var newTarget = jQuery(e.relatedTarget);
						if ( ! newTarget.data('trx-effects-mouse-helper') ) {
							newTarget = newTarget.parents('[data-trx-effects-mouse-helper]').eq(0);
						}
						if ( newTarget.length > 0 && newTarget.data('trx-effects-mouse-helper') ) {
							setTimeout( function() {
								newTarget.trigger('mouseenter');
							}, 0 );
						}
					}
				} )

				.on("mousedown", '[data-trx-effects-mouse-helper]', function(e) {
					var $self = jQuery(this);
					$mouse_helper.addClass('trx_effects_mouse_helper_click');
					mouse_helper_callback = $self.data( 'trx-effects-mouse-helper-callback' );
					if ( mouse_helper_callback === undefined ) {
						mouse_helper_callback = '';
					}
					if ( mouse_helper_callback && typeof window[mouse_helper_callback] == 'function' ) {
						window[mouse_helper_callback]( 'mousedown', $mouse_helper, $self, e );
					} else if ( typeof window['trx_effects_mouse_helper_callback_' + mouse_helper_action] == 'function' ) {
						window['trx_effects_mouse_helper_callback_' + mouse_helper_action]( 'mousedown', $mouse_helper, $self, e );
					}
				} )

				.on("mouseup", '[data-trx-effects-mouse-helper]', function(e) {
					var $self = jQuery(this);
					$mouse_helper.removeClass('trx_effects_mouse_helper_click');
					mouse_helper_callback = $self.data( 'trx-effects-mouse-helper-callback' );
					if ( mouse_helper_callback === undefined ) {
						mouse_helper_callback = '';
					}
					if ( mouse_helper_callback && typeof window[mouse_helper_callback] == 'function' ) {
						window[mouse_helper_callback]( 'mouseup', $mouse_helper, $self, e );
					} else if ( typeof window['trx_effects_mouse_helper_callback_' + mouse_helper_action] == 'function' ) {
						window['trx_effects_mouse_helper_callback_' + mouse_helper_action]( 'mouseup', $mouse_helper, $self, e );
					}
				} );

			var mouse_helper_reset = function() {
				$mouse_helper
					.find('.trx_effects_mouse_helper_image,.trx_effects_mouse_helper_text,.trx_effects_mouse_helper_icon,.trx_effects_mouse_helper_layout')
					.addClass('trx_effects_mouse_helper_reset_item')
					.fadeOut('slow', function() {
						var $self = jQuery(this);
						if ( $self.hasClass('trx_effects_mouse_helper_reset_item') ) {
							$self.remove();
						}
					});
				$mouse_helper
					.css( {
						'mix-blend-mode': mouse_helper_blend_mode,
						'color': mouse_helper_color,
						'background-color': mouse_helper_bg_color,
						'border-color': mouse_helper_bd_color
					} )
					.removeClass(
						"trx_effects_mouse_helper_active"
						+ " trx_effects_mouse_helper_with_icon"
						+ " trx_effects_mouse_helper_with_text"
						+ " trx_effects_mouse_helper_text_round"
						+ " trx_effects_mouse_helper_with_image"
						+ " trx_effects_mouse_helper_with_layout"
						+ ( TRX_EFFECTS_STORAGE['mouse_helper_centered'] > 0 ? "" : " trx_effects_mouse_helper_centered" )
						);
				if ( mouse_helper_callback && typeof window[mouse_helper_callback] == 'function' ) {
					window[mouse_helper_callback]( 'reset', $mouse_helper, mouse_helper_last_target, null );
					mouse_helper_callback = '';
				} else if ( typeof window['trx_effects_mouse_helper_callback_' + mouse_helper_last_action] == 'function' ) {
					window['trx_effects_mouse_helper_callback_' + mouse_helper_last_action]( 'reset', $mouse_helper, mouse_helper_last_target, e );
				}
			};

			var mouse_helper_move = function() {
				cancelAnimationFrame( mouse_helper_move );
				if ( _window_width >= TRX_EFFECTS_STORAGE['mobile_breakpoint_mousehelper_off'] && null !== mouseX && ( destX != mouseX || destY != mouseY ) && mouse_helper_delay > 1 ) {
					if ( $mouse_helper.hasClass( 'trx_effects_mouse_helper_permanent' ) || $mouse_helper.hasClass( 'trx_effects_mouse_helper_active' ) ) {
						destX += (mouseX - destX) / mouse_helper_delay;
						destY += (mouseY - destY) / mouse_helper_delay;
					} else {
						destX = mouseX;
						destY = mouseY;
					}
					$mouse_helper.css("transform", "translate(" + destX + "px," + destY + "px)");
				}
				requestAnimationFrame( mouse_helper_move );
			};
			requestAnimationFrame( mouse_helper_move );


			// Get current state
			function mouse_helper_get_state( e ) {
				if ( e.clientX === undefined ) return;
				realX = e.clientX + _window_scroll_left;
				realY = e.clientY + _window_scroll_top;
				if ( mouse_helper_axis.indexOf('x') != -1 ) mouseX = e.clientX;
				if ( mouse_helper_axis.indexOf('y') != -1 ) mouseY = e.clientY;
			}


			// Check magnets
			function mouse_helper_check_magnets() {

				$mouse_helper_magnets.each( function() {

					var item  = jQuery(this),
						inner = item.children(),
						koef = item.data('trx-effects-mouse-helper-magnet-velocity') ? item.data('trx-effects-mouse-helper-magnet-velocity') : 1,
						delta = item.data('trx-effects-mouse-helper-magnet') * koef;

					var data, cx, cy, iw, ih, ix, iy, near; //position variables

					requestAnimationFrame( control_item );

					function control_item() {
						var off = item.offset();
						cx = realX;
						cy = realY;
						iw = item.width();
						ih = item.height();
						ix = off.left + iw / 2;
						iy = off.top + ih / 2;
						near = Math.abs(ix - cx) < iw * koef && Math.abs(iy - cy) < ih * koef;

						if (near) {
							! item.hasClass( 'trx_effects_mouse_helper_near' ) && move_item();
							requestAnimationFrame( control_item );
						} else {
							item.hasClass( 'trx_effects_mouse_helper_near' ) && reset_item();
						}
					}

					function move_item() {

						item.addClass('trx_effects_mouse_helper_near');

						var d  = get_closest_position(),
							dx = d.x,
							dy = d.y,
							nx = 0,
							ny = 0;

						transform_item();

						function transform_item() {
							var d = get_closest_position();
							nx += (d.x - dx) / 5;
							ny += (d.y - dy) / 5;

							nx.toFixed(2) !== dx.toFixed(2) &&
								inner.css({
									'transition': 'none',
									'transform':  'translate3d(' + nx + 'px, ' + ny + 'px, 0)'
								});

							dx = nx;
							dy = ny;

							requestAnimationFrame(function () {
								near && transform_item();
							});
						}

						function get_closest_position() {
							return {
								x: Math.abs(cx - ix) < delta ? cx - ix : delta * (cx - ix) / Math.abs(cx - ix),
								y: Math.abs(cy - iy) < delta ? cy - iy : delta * (cy - iy) / Math.abs(cy - iy)
							};
						}
					}

					function reset_item() {

						item.removeClass('trx_effects_mouse_helper_near');

						inner
							.css({
								'transition': 'transform 0.5s',
								'transform':  'translate3d(0px, 0px, 0px)'
							})
							.one( typeof window.trx_effects_transition_end != 'undefined' ? trx_effects_transition_end() : 'transitionend', function () {
								inner.css({
									'transition': 'none'
								});
							});
					}
				} );
			}
		}

		// Add Mouse helper to the TOC menu
		$document.on( 'trx_effects_action_build_page_toc', function() {
			jQuery( '#toc_menu .toc_menu_item' ).each( function() {
				if ( TRX_EFFECTS_STORAGE['mouse_helper'] > 0 ) {
					var $self = jQuery(this),
						title = $self.attr( 'title' ) || $self.find( '.toc_menu_description_title' ).text();
					$self.attr( {
						'data-trx-effects-mouse-helper': 'hover',
						'data-trx-effects-mouse-helper-axis': 'y',
						'data-trx-effects-mouse-helper-text': TRX_EFFECTS_STORAGE['msg_mouse_helper_anchor'] + ( title ? ' ' + title : '' )
					} );
				}
			} );
		} );

	} );

})();