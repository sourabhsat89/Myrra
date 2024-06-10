/* global jQuery:false */

(function() {

	"use strict";

	var $window   = jQuery( window ),
		$document = jQuery( document );

	$document.on( 'trx_effects_action_init_hidden_elements', function(e, cont) {
		trx_effects_elementor_add_bg_text( cont );
	} );

	// Add background text to the sections
	function trx_effects_elementor_add_bg_text( cont ) {
		if ( cont.hasClass('elementor-section') ) {
			cont.find('.trx_effects_bg_text').remove();
			trx_effects_elementor_add_bg_text_to_row( cont );
		} else {
			jQuery( ( typeof window.elementorFrontend !== 'undefined' && elementorFrontend.isEditMode()
						? '.elementor-section.elementor-element-edit-mode'
						: '.trx_effects_has_bg_text'
						)
					+ ':not(.trx_effects_has_bg_text_inited)'
			).each( function() {
				trx_effects_elementor_add_bg_text_to_row( jQuery( this ) );
			} );
		}
	}

	// Add background text to the single section
	function trx_effects_elementor_add_bg_text_to_row( row ) {
		var data = row.data('trx-effects-bg-text'),
			cid = '';
		if ( ! data ) {
			cid  = row.data('model-cid');
			if ( cid ) {
				data = trx_effects_elementor_get_settings_by_cid( cid, ['bg_text'] );
			}
		}
		if ( ! data ) {
			return;
		}
		if ( data['bg_text'] ) {
			if ( ! row.hasClass( 'trx_effects_has_bg_text' ) ) {
				row.addClass( 'trx_effects_has_bg_text' );
			}
			var row_cont = row.addClass('trx_effects_has_bg_text_inited');	//.find('.elementor-container').eq(0);
			var chars = '', in_tag=false, ch;
			for ( var i=0; i < data['bg_text'].length; i++ ) {
				ch = data['bg_text'].substr(i, 1);
				if ( ! in_tag ) {
					if ( ch == '<' ) {
						in_tag = true;
					} else {
						chars += '<span class="trx_effects_bg_text_char">' + ( ch == ' ' ? '&nbsp;' : ch ) + '</span>';
					}
				}
				if ( in_tag ) {
					chars += ch;
					if ( ch == '>' ) {
						in_tag = false;
					}
				}
			}
			var marquee_speed = typeof data['bg_text_marquee'] == 'object'
						? ( data['bg_text_marquee']['size']
							? data['bg_text_marquee']['size']
							: 0
							)
						: data['bg_text_marquee'],
				overlay = typeof data['bg_text_overlay'] == 'object'
						? data['bg_text_overlay']['url']
						: data['bg_text_overlay'];
			if ( typeof window.TweenMax == 'undefined' ) {
				marquee_speed = 0;
			}
			row_cont.prepend(
				'<div class="trx_effects_bg_text' + ( marquee_speed > 0 ? ' trx_effects_marquee_wrap' : '') + '">'
					+ '<div class="trx_effects_bg_text_inner'
									+ ' trx_effects_bg_text_effect_' + data['bg_text_effect']
									+ ( marquee_speed > 0 ? ' trx_effects_marquee_element' : '')
									+ ( cid === '' ? ' trx_effects_show_on_scroll' : ' trx_effects_showed_on_scroll trx_effects_in_preview_mode' )
									+ '"'
					+ '>'
						+ chars
					+ '</div>'
					+ ( overlay
						? '<div class="trx_effects_bg_text_overlay trx_effects_show_on_scroll"></div>'
						: ''
						)
				+ '</div>'
			);
			$document.trigger( 'trx_effects_action_got_ajax_response', [''] );
			if ( marquee_speed > 0 && cid === '' ) {
				var marquee_wrap = row_cont.find('.trx_effects_marquee_wrap').eq(0),
					marquee_chars = marquee_wrap.find( '.trx_effects_bg_text_char' ).length,
					marquee_time = 20 * marquee_chars / 15;
				setTimeout( function() {
					trx_effects_elementor_marquee_bg_text( marquee_wrap, marquee_speed, marquee_time, true );
				}, marquee_chars * 100 + 800 );
			}
		}
	}

	// Marqueue bg text
	function trx_effects_elementor_marquee_bg_text( marquee_wrap, marquee_speed, marquee_time, start ) {
		var elements = marquee_wrap.find('.trx_effects_marquee_element'),
			mw = elements.eq(0).outerWidth(),
			mx = 0,
			mpw = marquee_wrap.width();
		if ( elements.eq(0).hasClass( 'trx_effects_showed_on_scroll' ) ) {
			if ( start ) {
				for (var i=1; i < Math.ceil((mpw + mw) / mw); i++ ) {
					var element_clone = elements.eq(0).clone();
					elements.eq(0).after( element_clone );
				}
				elements = marquee_wrap.find('.trx_effects_marquee_element');
			}
			elements.each( function(idx) {
				TweenMax.to(
					elements.eq(idx),
					marquee_time - marquee_time * 0.8 * marquee_speed / 10,
					{
						x: -mw,
						y: 0,
						ease: Power0.easeNone,
						onComplete: function() {
							if ( idx == elements.length - 1 ) {
								elements.each( function(idx2) {
									TweenMax.to(
										elements.eq(idx2),
										0,
										{
											x: 0,
											y: 0,
											ease: Power0.easeNone
										}
									);
								});
								setTimeout( function() {
									trx_effects_elementor_marquee_bg_text( marquee_wrap, marquee_speed, marquee_time, false );
								}, 1);
							}
						}
					}
				);
			} );
		} else {
			setTimeout( function() {
				trx_effects_elementor_marquee_bg_text( marquee_wrap, marquee_speed, marquee_time, start );
			}, elements.eq(0).find( '.trx_effects_bg_text_char' ).length * 100 + 800 );
		}
	}

})();