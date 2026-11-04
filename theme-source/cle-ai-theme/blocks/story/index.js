( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;
	var ICONS = [ 'chat', 'beer', 'hotdog', 'calendar', 'pin', 'headphones' ];

	// One replaceable image: a Media Library pick, or the theme's bundled default.
	function ImageSlot( props ) {
		return el( 'div', { style: { marginBottom: '12px' } },
			el( 'div', null, el( 'strong', null, props.label ) ),
			el( 'div', null, props.imageId ? __( 'Media Library image #', 'cle-ai' ) + props.imageId : __( 'Theme default', 'cle-ai' ) ),
			el( be.MediaUploadCheck, null,
				el( be.MediaUpload, {
					allowedTypes: [ 'image' ],
					value: props.imageId,
					onSelect: function ( m ) { props.onChange( m.id ); },
					render: function ( o ) { return el( c.Button, { variant: 'secondary', size: 'small', onClick: o.open }, __( 'Replace', 'cle-ai' ) ); },
				} )
			),
			props.imageId ? el( c.Button, { variant: 'link', onClick: function () { props.onChange( 0 ); } }, __( 'Use theme default', 'cle-ai' ) ) : null
		);
	}

	wp.blocks.registerBlockType( 'cle/story', {
		edit: function ( props ) {
			var a = props.attributes;
			var set = function ( key ) { return function ( v ) { var o = {}; o[ key ] = v; props.setAttributes( o ); }; };
			var updateItem = function ( key, i, patch ) {
				var next = ( a[ key ] || [] ).slice();
				next[ i ] = Object.assign( {}, next[ i ], patch );
				var o = {};
				o[ key ] = next;
				props.setAttributes( o );
			};
			var tv = a.tv || {};
			var tvField = function ( k, label ) {
				return el( c.TextControl, {
					label: label,
					type: 'number',
					value: tv[ k ],
					onChange: function ( v ) { var p = {}; p[ k ] = parseFloat( v ) || 0; props.setAttributes( { tv: Object.assign( {}, tv, p ) } ); },
				} );
			};
			var spots = a.hotspots || [];
			var inner = be.useInnerBlocksProps( { className: 'cle-story__chapters' }, {
				allowedBlocks: [ 'cle/story-chapter' ],
				template: [ [ 'cle/story-chapter', { title: __( 'First chapter', 'cle-ai' ) } ] ],
			} );

			return el( 'div', be.useBlockProps( { className: 'is-mode-' + a.mode } ),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Story', 'cle-ai' ) },
						el( c.SelectControl, {
							label: __( 'Presentation', 'cle-ai' ),
							value: a.mode,
							options: [
								{ label: __( 'Pinned scene (stage)', 'cle-ai' ), value: 'stage' },
								{ label: __( 'Stacked chapters', 'cle-ai' ), value: 'stacked' },
							],
							onChange: set( 'mode' ),
						} ),
						el( c.TextControl, { label: __( 'Chapter menu name (screen readers)', 'cle-ai' ), value: a.railLabel, onChange: set( 'railLabel' ) } )
					),
					el( c.PanelBody, { title: __( 'Scene images', 'cle-ai' ), initialOpen: false },
						el( 'p', null, __( 'Layers are transparent images at the same size (2000×1116) so they stack exactly. Replace one to swap the art.', 'cle-ai' ) ),
						( a.layers || [] ).map( function ( l, i ) {
							return el( ImageSlot, { key: l.slug, label: l.label || l.slug, imageId: l.imageId, onChange: function ( id ) { updateItem( 'layers', i, { imageId: id } ); } } );
						} ),
						el( ImageSlot, { label: __( 'Night room', 'cle-ai' ), imageId: a.nightId, onChange: set( 'nightId' ) } ),
						el( ImageSlot, { label: __( 'Whole scene (stacked crops)', 'cle-ai' ), imageId: a.compositeId, onChange: set( 'compositeId' ) } ),
						el( ImageSlot, { label: __( 'Finale pattern', 'cle-ai' ), imageId: a.patternId, onChange: set( 'patternId' ) } ),
						( a.foregrounds || [] ).map( function ( f, i ) {
							return el( ImageSlot, { key: f.slug, label: f.label || f.slug, imageId: f.imageId, onChange: function ( id ) { updateItem( 'foregrounds', i, { imageId: id } ); } } );
						} )
					),
					el( c.PanelBody, { title: __( 'TV screen (night chapter)', 'cle-ai' ), initialOpen: false },
						el( c.TextControl, { label: __( 'Label', 'cle-ai' ), value: a.tvLabel, onChange: set( 'tvLabel' ) } ),
						el( c.TextControl, { label: __( 'Show the next event whose title contains', 'cle-ai' ), value: a.tvMatch, onChange: set( 'tvMatch' ) } ),
						el( c.TextareaControl, { label: __( 'Sponsor crawl', 'cle-ai' ), value: a.sponsors, onChange: set( 'sponsors' ) } ),
						tvField( 'x', __( 'Left %', 'cle-ai' ) ),
						tvField( 'y', __( 'Top %', 'cle-ai' ) ),
						tvField( 'w', __( 'Width %', 'cle-ai' ) ),
						tvField( 'h', __( 'Height %', 'cle-ai' ) )
					),
					el( c.PanelBody, { title: __( 'Tap-able markers', 'cle-ai' ), initialOpen: false },
						el( c.SelectControl, {
							label: __( 'Marker style', 'cle-ai' ),
							value: a.markerStyle,
							options: [
								{ label: __( 'Icon', 'cle-ai' ), value: 'icon' },
								{ label: __( 'Numbered', 'cle-ai' ), value: 'numbered' },
								{ label: __( 'Dot', 'cle-ai' ), value: 'dot' },
								{ label: __( 'Question mark', 'cle-ai' ), value: 'question' },
							],
							onChange: set( 'markerStyle' ),
						} ),
						spots.map( function ( s, i ) {
							return el( 'div', { key: s.id || i },
								el( 'hr' ),
								el( c.TextControl, { label: __( 'Title', 'cle-ai' ), value: s.title, onChange: function ( v ) { updateItem( 'hotspots', i, { title: v } ); } } ),
								el( c.TextareaControl, { label: __( 'Note', 'cle-ai' ), value: s.body, onChange: function ( v ) { updateItem( 'hotspots', i, { body: v } ); } } ),
								el( c.SelectControl, {
									label: __( 'Icon', 'cle-ai' ),
									value: s.icon || 'chat',
									options: ICONS.map( function ( k ) { return { label: k, value: k }; } ),
									onChange: function ( v ) { updateItem( 'hotspots', i, { icon: v } ); },
								} ),
								el( c.Flex, null,
									el( c.TextControl, { label: __( 'X %', 'cle-ai' ), type: 'number', value: s.x, onChange: function ( v ) { updateItem( 'hotspots', i, { x: parseFloat( v ) || 0 } ); } } ),
									el( c.TextControl, { label: __( 'Y %', 'cle-ai' ), type: 'number', value: s.y, onChange: function ( v ) { updateItem( 'hotspots', i, { y: parseFloat( v ) || 0 } ); } } )
								),
								el( c.Button, {
									variant: 'link',
									isDestructive: true,
									onClick: function () { props.setAttributes( { hotspots: spots.filter( function ( x, k ) { return k !== i; } ) } ); },
								}, __( 'Delete marker', 'cle-ai' ) )
							);
						} ),
						el( c.Button, {
							variant: 'secondary',
							onClick: function () { props.setAttributes( { hotspots: spots.concat( [ { id: 'hs-' + Date.now(), x: 50, y: 50, title: '', body: '', icon: 'chat' } ] ) } ); },
						}, __( 'Add marker', 'cle-ai' ) )
					)
				),
				el( 'p', { className: 'cle-scroll-cue' }, __( 'Story stage: each chapter below drives the scene while it is on screen. Select a chapter to aim its camera and pick its layers.', 'cle-ai' ) ),
				el( 'div', inner )
			);
		},
		save: function () {
			return el( be.InnerBlocks.Content );
		},
	} );
} )( window.wp );
