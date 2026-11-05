( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;
	var useState = wp.element.useState;
	var ICONS = [ 'chat', 'beer', 'hotdog', 'calendar', 'pin', 'headphones' ];
	var round = function ( n ) { return Math.round( n * 10 ) / 10; };
	var theme = function () { return window.cleTheme || { icons: {}, story: {} }; };

	wp.blocks.registerBlockType( 'cle/story-chapter', {
		edit: function ( props ) {
			var a = props.attributes;
			var ctx = props.context;
			var set = function ( key ) { return function ( v ) { var o = {}; o[ key ] = v; props.setAttributes( o ); }; };
			var layerDefs = ctx[ 'cle/layers' ] || [];
			var fgDefs = ctx[ 'cle/foregrounds' ] || [];
			var modeState = useState( 'camera' );
			var mode = modeState[ 0 ];
			var setMode = modeState[ 1 ];
			var imageId = a.night ? ctx[ 'cle/nightId' ] : ctx[ 'cle/compositeId' ];
			var media = wp.data.useSelect( function ( s ) { return imageId ? s( 'core' ).getMedia( imageId ) : null; }, [ imageId ] );
			var src = media ? media.source_url : theme().story[ a.night ? 'neon' : 'composite' ];
			var cam = a.camera || { x: 50, y: 50, zoom: 1 };
			var bubbles = a.bubbles || [];
			var setCam = function ( patch ) { props.setAttributes( { camera: Object.assign( {}, cam, patch ) } ); };

			// Clicking the preview aims the camera, or places a bubble (mode = its index) / the pin.
			// Bubbles and the pin can also be placed from the keyboard with the X % / Y % fields.
			var onPreviewClick = function ( e ) {
				var r = e.currentTarget.getBoundingClientRect();
				var p = { x: round( ( e.clientX - r.left ) / r.width * 100 ), y: round( ( e.clientY - r.top ) / r.height * 100 ) };
				if ( 'number' === typeof mode ) {
					updateBubble( mode, p );
					setMode( 'camera' );
				} else if ( 'pin' === mode ) {
					props.setAttributes( { pin: p } );
					setMode( 'camera' );
				} else {
					setCam( p );
				}
			};
			var updateBubble = function ( i, patch ) {
				var next = bubbles.slice();
				next[ i ] = Object.assign( {}, next[ i ], patch );
				props.setAttributes( { bubbles: next } );
			};
			// Keep the story's layer order so a progressive reveal runs in that order.
			var toggleLayer = function ( slug, on ) {
				var current = a.layers || [];
				var next = layerDefs.map( function ( l ) { return l.slug; } ).filter( function ( s ) {
					return s === slug ? on : -1 !== current.indexOf( s );
				} );
				props.setAttributes( { layers: next } );
			};
			var inner = be.useInnerBlocksProps( { className: 'cle-chapter__body' }, {
				allowedBlocks: [ 'core/heading', 'core/paragraph', 'core/list', 'core/buttons', 'core/button', 'cle/next-event' ],
				template: [
					[ 'core/heading', { placeholder: __( 'Chapter heading', 'cle-ai' ) } ],
					[ 'core/paragraph', { placeholder: __( 'What happens in this part of the story?', 'cle-ai' ) } ],
				],
			} );
			var numberField = function ( label, value, onChange ) {
				return el( c.TextControl, { label: label, type: 'number', value: value, onChange: function ( v ) { onChange( parseFloat( v ) || 0 ); } } );
			};
			var hint = 'number' === typeof mode ? __( 'Click to place the bubble', 'cle-ai' ) + ' ' + ( mode + 1 ) : ( 'pin' === mode ? __( 'Click to place the pin', 'cle-ai' ) : __( 'Click to aim the camera', 'cle-ai' ) );

			return el( 'article', be.useBlockProps( { className: 'cle-chapter' } ),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Chapter', 'cle-ai' ) },
						el( c.TextControl, { label: __( 'Title (rail label and link)', 'cle-ai' ), value: a.title, onChange: set( 'title' ) } ),
						el( c.SelectControl, {
							label: __( 'Rail icon', 'cle-ai' ),
							value: a.icon,
							options: [ { label: __( 'None', 'cle-ai' ), value: '' } ].concat( ICONS.map( function ( s ) { return { label: s, value: s }; } ) ),
							onChange: set( 'icon' ),
						} )
					),
					el( c.PanelBody, { title: __( 'Scene', 'cle-ai' ) },
						el( 'p', null, __( 'Layers visible in this chapter', 'cle-ai' ) ),
						layerDefs.map( function ( l ) {
							return el( c.CheckboxControl, {
								key: l.slug,
								label: l.label || l.slug,
								checked: -1 !== ( a.layers || [] ).indexOf( l.slug ),
								onChange: function ( on ) { toggleLayer( l.slug, on ); },
							} );
						} ),
						el( c.ToggleControl, { label: __( 'Reveal layers one by one while scrolling', 'cle-ai' ), checked: a.reveal, onChange: set( 'reveal' ) } ),
						el( c.ToggleControl, { label: __( 'Night (neon room, indigo page)', 'cle-ai' ), checked: a.night, onChange: set( 'night' ) } ),
						el( c.ToggleControl, { label: __( 'Tap-able markers on', 'cle-ai' ), checked: a.hotspots, onChange: set( 'hotspots' ) } ),
						el( c.ToggleControl, { label: __( 'Finale: hide the scene, show the pattern', 'cle-ai' ), checked: a.pattern, onChange: set( 'pattern' ) } ),
						el( c.SelectControl, {
							label: __( 'Foreground object', 'cle-ai' ),
							value: a.foreground,
							options: [ { label: __( 'None', 'cle-ai' ), value: '' } ].concat( fgDefs.map( function ( f ) { return { label: f.label || f.slug, value: f.slug }; } ) ),
							onChange: set( 'foreground' ),
						} )
					),
					el( c.PanelBody, { title: __( 'Camera', 'cle-ai' ) },
						el( c.RangeControl, { label: __( 'Zoom', 'cle-ai' ), min: 0.1, max: 3, step: 0.05, value: cam.zoom, onChange: function ( v ) { setCam( { zoom: v } ); } } ),
						el( c.TextControl, { label: __( 'Focus X % (can go below 0 or above 100)', 'cle-ai' ), type: 'number', value: cam.x, onChange: function ( v ) { setCam( { x: parseFloat( v ) || 0 } ); } } ),
						el( c.TextControl, { label: __( 'Focus Y %', 'cle-ai' ), type: 'number', value: cam.y, onChange: function ( v ) { setCam( { y: parseFloat( v ) || 0 } ); } } )
					),
					el( c.PanelBody, { title: __( 'Speech bubbles and pin', 'cle-ai' ), initialOpen: false },
						bubbles.map( function ( b, i ) {
							return el( 'div', { key: i },
								el( c.TextControl, { label: __( 'Bubble', 'cle-ai' ) + ' ' + ( i + 1 ), value: b.text, onChange: function ( v ) { updateBubble( i, { text: v } ); } } ),
								el( c.Flex, null,
									numberField( __( 'X %', 'cle-ai' ), b.x, function ( v ) { updateBubble( i, { x: v } ); } ),
									numberField( __( 'Y %', 'cle-ai' ), b.y, function ( v ) { updateBubble( i, { y: v } ); } )
								),
								el( c.Button, {
									variant: 'link',
									isDestructive: true,
									onClick: function () { props.setAttributes( { bubbles: bubbles.filter( function ( x, k ) { return k !== i; } ) } ); setMode( 'camera' ); },
								}, __( 'Remove bubble', 'cle-ai' ) )
							);
						} ),
						el( c.Button, {
							variant: 'secondary',
							onClick: function () {
								props.setAttributes( { bubbles: bubbles.concat( [ { x: 50, y: 50, text: '' } ] ) } );
								setMode( bubbles.length );
							},
						}, __( 'Add a bubble, then click the scene or type X % / Y %', 'cle-ai' ) ),
						el( 'hr' ),
						el( c.Button, {
							variant: 'secondary',
							onClick: function () {
								if ( ! a.pin ) {
									props.setAttributes( { pin: { x: 50, y: 50 } } );
								}
								setMode( 'pin' );
							},
						}, a.pin ? __( 'Move the pin, then click the scene', 'cle-ai' ) : __( 'Add a pin, then click the scene or type X % / Y %', 'cle-ai' ) ),
						a.pin ? el( c.Flex, null,
							numberField( __( 'Pin X %', 'cle-ai' ), a.pin.x, function ( v ) { props.setAttributes( { pin: Object.assign( {}, a.pin, { x: v } ) } ); } ),
							numberField( __( 'Pin Y %', 'cle-ai' ), a.pin.y, function ( v ) { props.setAttributes( { pin: Object.assign( {}, a.pin, { y: v } ) } ); } )
						) : null,
						a.pin ? el( c.Button, { variant: 'link', isDestructive: true, onClick: function () { props.setAttributes( { pin: undefined } ); } }, __( 'Remove pin', 'cle-ai' ) ) : null
					)
				),
				el( 'div', { className: 'cle-chapter-editor__head' },
					a.icon ? el( 'span', { className: 'cle-chapter__icon', dangerouslySetInnerHTML: { __html: theme().icons[ a.icon ] || '' } } ) : null,
					el( 'strong', null, a.title || __( 'Untitled chapter', 'cle-ai' ) )
				),
				src && ! a.pattern ? el( 'div', {
					className: 'cle-chapter-preview',
					onClick: onPreviewClick,
					style: { '--cam-x': cam.x + '%', '--cam-y': cam.y + '%', '--cam-z': cam.zoom },
				},
					el( 'img', { src: src, alt: '', draggable: false } ),
					el( 'span', { className: 'cle-chapter-preview__view' } ),
					bubbles.map( function ( b, i ) {
						return el( 'span', { key: 'b' + i, className: 'cle-chapter-preview__dot', style: { '--x': b.x + '%', '--y': b.y + '%' } }, String( i + 1 ) );
					} ),
					a.pin ? el( 'span', { className: 'cle-chapter-preview__dot is-pin', style: { '--x': a.pin.x + '%', '--y': a.pin.y + '%' } }, 'P' ) : null,
					el( 'span', { className: 'cle-chapter-preview__hint' }, hint )
				) : null,
				el( 'div', inner )
			);
		},
		save: function () {
			return el( be.InnerBlocks.Content );
		},
	} );
} )( window.wp );
