/* global jQuery:false */

(function() {

	"use strict";

	var $window   = jQuery( window ),
		$document = jQuery( document );

	$document.on( 'trx_effects_action_init_hidden_elements', function(e, cont) {
		trx_effects_elementor_add_bg_slides( cont );
	} );

	// Add background slides to the sections
	function trx_effects_elementor_add_bg_slides( cont ) {
		if ( cont.hasClass('elementor-section') ) {
			cont.find('.trx_effects_bg_slides_img,.trx_effects_bg_slides_overlay').remove();
			trx_effects_elementor_add_bg_slides_to_row( cont );
		} else {
			jQuery( ( typeof window.elementorFrontend !== 'undefined' && elementorFrontend.isEditMode()
						? '.elementor-section.elementor-element-edit-mode'
						: '.trx_effects_has_bg_slides'
						)
					+ ':not(.trx_effects_has_bg_slides_inited)'
			).each( function() {
				trx_effects_elementor_add_bg_slides_to_row( jQuery( this ) );
			} );
		}
	}

	// Add background slides to the single section
	function trx_effects_elementor_add_bg_slides_to_row( row ) {
		var data = row.data('trx-effects-bg-slides'),
			cid = '';
		if ( ! data ) {
			cid  = row.data('model-cid');
			if ( cid ) {
				data = trx_effects_elementor_get_settings_by_cid( cid, ['bg_slides'] );
			}
		}
		if ( ! data ) {
			return;
		}
		if ( data['bg_slides_allow'] > 0 && data['bg_slides'].length > 0 ) {
			if ( ! row.hasClass( 'trx_effects_has_bg_slides' ) ) {
				row.addClass( 'trx_effects_has_bg_slides' );
			}
			var row_cont = row.addClass('trx_effects_has_bg_slides_inited');	//.find('.elementor-container').eq(0);
			var output = '',
				duration = typeof data['bg_slides_animation_duration'] == 'object' ? data['bg_slides_animation_duration']['size'] : data['bg_slides_animation_duration'];
			if ( duration ) {
				row_cont.get(0).style.setProperty( '--trx-effects-bg-slides-animation-duration', duration+'s' );
			} else {
				duration = 6.5;
			}
			for( var i = 0; i < data['bg_slides'].length; i++ ) {
				if ( data['bg_slides'][i]['slide']['url'] ) {
					output += '<img'
									+ ' src="' + data['bg_slides'][i]['slide']['url'] + '"'
									+ ' class="trx_effects_bg_slides_img'
											+ ' trx_effects_bg_slides_img_' + data['bg_slides'][i]['slide_size']
											+ ( i === 0 ? ' trx_effects_bg_slides_active' : '' )
											+ ( duration > 0 && data['bg_slides'][i]['slide_effect'] != 'none'
												? (' trx_effects_bg_slides_animation_origin_' + data['bg_slides'][i]['slide_origin']
													+ ( i === 0 ? ' trx_effects_bg_slides_animation_' + data['bg_slides'][i]['slide_effect'] : '' )
													)
												: ' trx_effects_bg_slides_static'
												)
											+ '"'
									+ ( duration > 0
										? ' data-trx-effects-bg-slides-animation="' + data['bg_slides'][i]['slide_effect'] + '"'
										: ''
										)
									+ '>';
				}
			}
			if ( output ) {
				if ( data['bg_slides_overlay_color'] ) {
					output += '<div class="trx_effects_bg_slides_overlay" style="background-color:' + data['bg_slides_overlay_color'] + '"></div>';
				}
				row_cont.prepend( output );
				if ( duration > 0 ) {
					var images = row_cont.find( '.trx_effects_bg_slides_img' ),
						active_slide = row_cont.find( '.trx_effects_bg_slides_active' );
					var active_slide_changer = function() {
							var active_slide = row_cont.find( '.trx_effects_bg_slides_active' ),
								active_idx = active_slide.index(),
								next_idx = active_idx + 1 >= images.length ? 0 : active_idx + 1;
//							active_slide.removeClass( 'trx_effects_bg_slides_active trx_effects_bg_slides_animation_' + data['bg_slides'][active_idx]['slide_effect'] );
							active_slide.removeClass( 'trx_effects_bg_slides_active' );
							setTimeout( function() {
								active_slide.removeClass( 'trx_effects_bg_slides_animation_' + data['bg_slides'][active_idx]['slide_effect'] );
							}, 500 );
							images.eq(next_idx).addClass( 'trx_effects_bg_slides_active trx_effects_bg_slides_animation_' + data['bg_slides'][next_idx]['slide_effect'] );
							if ( ! images.eq(next_idx).hasClass( 'trx_effects_bg_slides_static' ) ) {
								active_slide_timer( next_idx );
							}
						},
						active_slide_timer = function( idx ) {
							if ( data['bg_slides'][idx]['slide_effect'] != 'none' ) {
								TrxEffectsOnEndAnimation( images.get(idx), active_slide_changer, duration * 1000 );
							} else {
								setTimeout( function() {
									active_slide_changer();
								}, duration );
							}
						};
					if ( ! images.eq(active_slide.index()).hasClass( 'trx_effects_bg_slides_static' ) ) {
						active_slide_timer( active_slide.index() );
					}
				}
			}
		}
	}

})();