( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;
	var useState = wp.element.useState;
	var round = function ( n ) { return Math.round( n * 10 ) / 10; };

	wp.blocks.registerBlockType( 'cle/world-chapter', {
		edit: function ( props ) {
			var a = props.attributes;
			var cam = a.camera || { x: 50, y: 50, zoom: 1 };
			var spots = a.hotspots || [];
			var tag = a.tag || { x: 50, y: 50 };
			var modeState = useState( 'camera' );
			var mode = modeState[ 0 ];
			var setMode = modeState[ 1 ];
			var imageId = props.context[ 'cle/worldImageId' ];
			var media = wp.data.useSelect( function ( s ) { return imageId ? s( 'core' ).getMedia( imageId ) : null; }, [ imageId ] );
			var src = media ? media.source_url : ( window.cleTheme && window.cleTheme.story && window.cleTheme.story.world );
			var setCam = function ( patch ) { props.setAttributes( { camera: Object.assign( {}, cam, patch ) } ); };
			var setSpot = function ( i, patch ) {
				var next = spots.slice();
				next[ i ] = Object.assign( {}, next[ i ], patch );
				props.setAttributes( { hotspots: next } );
			};
			var onPreviewClick = function ( e ) {
				var r = e.currentTarget.getBoundingClientRect();
				var p = { x: round( ( e.clientX - r.left ) / r.width * 100 ), y: round( ( e.clientY - r.top ) / r.height * 100 ) };
				if ( 'marker' === mode ) {
					props.setAttributes( { hotspots: spots.concat( [ { id: 'hs-' + Date.now(), x: p.x, y: p.y, title: '', body: '' } ] ) } );
					setMode( 'camera' );
				} else if ( 'tag' === mode ) {
					props.setAttributes( { tag: p } );
					setMode( 'camera' );
				} else {
					setCam( p );
				}
			};
			var inner = be.useInnerBlocksProps( { className: 'cle-wchapter__body' }, {
				allowedBlocks: [ 'core/heading', 'core/paragraph', 'core/list', 'core/buttons', 'core/button', 'cle/next-event', 'cle/coming-up' ],
				template: [
					[ 'core/heading', { placeholder: __( 'Chapter heading', 'cle-ai' ) } ],
					[ 'core/paragraph', { placeholder: __( 'What happens in this part of the story?', 'cle-ai' ) } ],
				],
			} );
			var number = function ( label, value, onChange, step ) {
				return el( c.TextControl, { label: label, type: 'number', step: step || 1, value: value, onChange: function ( v ) { onChange( parseFloat( v ) || 0 ); } } );
			};

			return el( 'article', be.useBlockProps( { className: 'cle-wchapter' } ),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Chapter', 'cle-ai' ) },
						el( c.TextControl, { label: __( 'Title (used for the link to this chapter)', 'cle-ai' ), value: a.title, onChange: function ( v ) { props.setAttributes( { title: v } ); } } )
					),
					el( c.PanelBody, { title: __( 'Camera', 'cle-ai' ) },
						el( 'p', null, __( 'Click the preview to choose where the camera looks.', 'cle-ai' ) ),
						el( c.RangeControl, { label: __( 'Zoom', 'cle-ai' ), min: 1, max: 4, step: 0.05, value: cam.zoom, onChange: function ( v ) { setCam( { zoom: v } ); } } ),
						number( __( 'Focus X %', 'cle-ai' ), cam.x, function ( v ) { setCam( { x: v } ); }, 0.1 ),
						number( __( 'Focus Y %', 'cle-ai' ), cam.y, function ( v ) { setCam( { y: v } ); }, 0.1 ),
						el( c.RangeControl, {
							label: __( 'Fade out below (%)', 'cle-ai' ),
							help: __( 'Hides the picture below this line, for example to show only the skyline. 0 is off.', 'cle-ai' ),
							min: 0, max: 100, step: 1, value: a.fadeBelow || 0,
							onChange: function ( v ) { props.setAttributes( { fadeBelow: v || 0 } ); },
						} )
					),
					el( c.PanelBody, { title: __( 'Tap-able markers', 'cle-ai' ), initialOpen: spots.length > 0 },
						spots.map( function ( s, i ) {
							return el( 'div', { key: s.id || i, style: { paddingBottom: '8px' } },
								el( 'hr' ),
								el( 'strong', null, String( i + 1 ) ),
								el( c.TextControl, { label: __( 'Title', 'cle-ai' ), value: s.title, onChange: function ( v ) { setSpot( i, { title: v } ); } } ),
								el( c.TextareaControl, { label: __( 'Note', 'cle-ai' ), value: s.body, onChange: function ( v ) { setSpot( i, { body: v } ); } } ),
								el( c.Flex, null,
									number( __( 'X %', 'cle-ai' ), s.x, function ( v ) { setSpot( i, { x: v } ); }, 0.1 ),
									number( __( 'Y %', 'cle-ai' ), s.y, function ( v ) { setSpot( i, { y: v } ); }, 0.1 )
								),
								el( c.Button, {
									variant: 'link',
									isDestructive: true,
									onClick: function () { props.setAttributes( { hotspots: spots.filter( function ( x, k ) { return k !== i; } ) } ); },
								}, __( 'Remove marker', 'cle-ai' ) )
							);
						} ),
						el( c.Button, { variant: 'secondary', onClick: function () { setMode( 'marker' ); } }, __( 'Add a marker, then click the preview', 'cle-ai' ) )
					),
					el( c.PanelBody, { title: __( 'Where Dot stands', 'cle-ai' ), initialOpen: !! a.stop },
						el( 'p', null, __( 'Dot walks through the picture: he stands here while this chapter is on screen and hops to the next chapter\u2019s stop as the camera moves on. Leave X empty to keep him where he was.', 'cle-ai' ) ),
						el( c.Flex, null,
							number( __( 'X %', 'cle-ai' ), a.stop ? a.stop.x : '', function ( v ) { props.setAttributes( { stop: v ? Object.assign( { y: 50 }, a.stop, { x: v } ) : undefined } ); }, 0.1 ),
							number( __( 'Y %', 'cle-ai' ), a.stop ? a.stop.y : '', function ( v ) { props.setAttributes( { stop: Object.assign( { x: 50 }, a.stop, { y: v } ) } ); }, 0.1 )
						)
					),
					el( c.PanelBody, { title: __( 'Finale tag', 'cle-ai' ), initialOpen: !! a.tag },
						el( 'p', null, __( 'In the last chapter the whole picture shows, with a tag on each place. Tapping a tag goes back to its chapter. The tag uses the chapter title.', 'cle-ai' ) ),
						el( c.ToggleControl, {
							label: __( 'Show a tag for this chapter', 'cle-ai' ),
							checked: !! a.tag,
							onChange: function ( on ) { props.setAttributes( { tag: on ? { x: cam.x, y: cam.y } : undefined, tagPhone: on ? a.tagPhone : undefined } ); },
						} ),
						a.tag ? el( 'div', null,
							el( c.Button, { variant: 'secondary', onClick: function () { setMode( 'tag' ); } }, __( 'Place the tag, then click the preview', 'cle-ai' ) ),
							el( c.Flex, null,
								number( __( 'X %', 'cle-ai' ), tag.x, function ( v ) { props.setAttributes( { tag: Object.assign( {}, tag, { x: v } ) } ); }, 0.1 ),
								number( __( 'Y %', 'cle-ai' ), tag.y, function ( v ) { props.setAttributes( { tag: Object.assign( {}, tag, { y: v } ) } ); }, 0.1 )
							),
							el( c.TextControl, { label: __( 'Short label for phones', 'cle-ai' ), help: __( 'Leave empty to use the title.', 'cle-ai' ), value: a.tagShort, onChange: function ( v ) { props.setAttributes( { tagShort: v } ); } } ),
							el( 'p', null, __( 'Phone position (optional, if tags overlap on phones):', 'cle-ai' ) ),
							el( c.Flex, null,
								number( __( 'Phone X %', 'cle-ai' ), a.tagPhone ? a.tagPhone.x : '', function ( v ) { props.setAttributes( { tagPhone: Object.assign( { x: tag.x, y: tag.y }, a.tagPhone, { x: v } ) } ); }, 0.1 ),
								number( __( 'Phone Y %', 'cle-ai' ), a.tagPhone ? a.tagPhone.y : '', function ( v ) { props.setAttributes( { tagPhone: Object.assign( { x: tag.x, y: tag.y }, a.tagPhone, { y: v } ) } ); }, 0.1 )
							),
							a.tagPhone ? el( c.Button, { variant: 'link', onClick: function () { props.setAttributes( { tagPhone: undefined } ); } }, __( 'Use the same position on phones', 'cle-ai' ) ) : null
						) : null
					)
				),
				el( 'div', { className: 'cle-chapter-editor__head' }, el( 'strong', null, a.title || __( 'Untitled chapter', 'cle-ai' ) ) ),
				src ? el( 'div', {
					className: 'cle-wchapter-preview',
					onClick: onPreviewClick,
					style: { '--cam-x': cam.x + '%', '--cam-y': cam.y + '%', '--cam-z': cam.zoom },
				},
					el( 'img', { src: src, alt: '', draggable: false } ),
					el( 'span', { className: 'cle-wchapter-preview__view' } ),
					a.fadeBelow > 0 ? el( 'span', { className: 'cle-wchapter-preview__cut', style: { '--cut': a.fadeBelow + '%' } } ) : null,
					spots.map( function ( s, i ) {
						return el( 'span', { key: 'm' + i, className: 'cle-wchapter-preview__dot', style: { '--x': s.x + '%', '--y': s.y + '%' } }, String( i + 1 ) );
					} ),
					a.tag ? el( 'span', { className: 'cle-wchapter-preview__tag', style: { '--x': tag.x + '%', '--y': tag.y + '%' } }, a.title || __( 'Tag', 'cle-ai' ) ) : null,
					el( 'span', { className: 'cle-wchapter-preview__hint' }, { marker: __( 'Click to place the marker', 'cle-ai' ), tag: __( 'Click to place the finale tag', 'cle-ai' ) }[ mode ] || __( 'Click to aim the camera', 'cle-ai' ) )
				) : null,
				el( 'div', inner )
			);
		},
		save: function () {
			return el( be.InnerBlocks.Content );
		},
	} );
} )( window.wp );
