( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;
	var useState = wp.element.useState;
	var useRef = wp.element.useRef;

	var clamp = function ( n ) { return Math.max( 0, Math.min( 100, n ) ); };
	var newId = function () { return 'hs-' + Math.random().toString( 36 ).slice( 2, 8 ); };
	var plain = function ( html ) { return ( html || '' ).replace( /<[^>]+>/g, '' ); };
	var ICONS = [ 'chat', 'beer', 'hotdog', 'calendar', 'pin', 'headphones' ];
	var marker = function ( style, s, i ) {
		if ( 'icon' === style ) {
			var icons = ( window.cleTheme && window.cleTheme.icons ) || {};
			return el( 'span', { 'aria-hidden': true, dangerouslySetInnerHTML: { __html: icons[ s.icon ] || icons.chat || '' } } );
		}
		return el( 'span', { 'aria-hidden': true }, 'numbered' === style ? String( i + 1 ) : ( 'question' === style ? '?' : '' ) );
	};

	wp.blocks.registerBlockType( 'cle/hotspot-scene', {
		edit: function ( props ) {
			var a = props.attributes;
			var spots = a.hotspots || [];
			var placingState = useState( false );
			var placing = placingState[ 0 ];
			var setPlacing = placingState[ 1 ];
			var openState = useState( null );
			var open = openState[ 0 ];
			var setOpen = openState[ 1 ];
			var frameRef = useRef();
			var media = wp.data.useSelect( function ( s ) {
				return a.imageId ? s( 'core' ).getMedia( a.imageId ) : null;
			}, [ a.imageId ] );

			var save = function ( next ) { props.setAttributes( { hotspots: next } ); };
			var update = function ( i, patch ) {
				var next = spots.slice();
				next[ i ] = Object.assign( {}, next[ i ], patch );
				save( next );
			};
			var remove = function ( i ) {
				setOpen( null );
				save( spots.filter( function ( s, k ) { return k !== i; } ) );
			};
			var move = function ( i, step ) {
				var j = i + step;
				if ( j < 0 || j >= spots.length ) {
					return;
				}
				var next = spots.slice();
				next[ i ] = spots[ j ];
				next[ j ] = spots[ i ];
				save( next );
				setOpen( null );
			};
			var pickImage = function ( m ) { props.setAttributes( { imageId: m.id } ); };

			// Pointer position as whole percentages of the image box.
			var posFrom = function ( e ) {
				var r = frameRef.current.getBoundingClientRect();
				return {
					x: clamp( Math.round( ( e.clientX - r.left ) / r.width * 100 ) ),
					y: clamp( Math.round( ( e.clientY - r.top ) / r.height * 100 ) ),
				};
			};

			// Placement mode: the next click on the image creates a marker and opens it.
			var onFrameClick = function ( e ) {
				if ( ! placing || e.target.closest( '.cle-scene__pin, .cle-scene__pop' ) ) {
					return;
				}
				save( spots.concat( [ Object.assign( { id: newId(), title: '', body: '' }, posFrom( e ) ) ] ) );
				setPlacing( false );
				setOpen( spots.length );
			};

			// Drag a marker to move it; a press without movement opens it for editing.
			var startDrag = function ( i ) {
				return function ( e ) {
					if ( 0 !== e.button ) {
						return;
					}
					e.preventDefault();
					e.stopPropagation();
					var doc = e.currentTarget.ownerDocument;
					var sx = e.clientX;
					var sy = e.clientY;
					var moved = false;
					var onMove = function ( ev ) {
						if ( ! moved && Math.abs( ev.clientX - sx ) + Math.abs( ev.clientY - sy ) < 4 ) {
							return;
						}
						moved = true;
						var next = spots.slice();
						next[ i ] = Object.assign( {}, spots[ i ], posFrom( ev ) );
						save( next );
					};
					var onUp = function () {
						doc.removeEventListener( 'pointermove', onMove );
						doc.removeEventListener( 'pointerup', onUp );
						if ( ! moved ) {
							setOpen( open === i ? null : i );
						}
					};
					doc.addEventListener( 'pointermove', onMove );
					doc.addEventListener( 'pointerup', onUp );
				};
			};

			var blockProps = be.useBlockProps( {
				className: 'cle-scene cle-scene--' + a.markerStyle + ' is-editing' + ( placing ? ' is-placing' : '' ),
			} );
			var innerProps = be.useInnerBlocksProps( { className: 'cle-scene__actions' }, {
				allowedBlocks: [ 'core/buttons', 'core/paragraph' ],
				renderAppender: be.InnerBlocks.ButtonBlockAppender,
			} );

			var sidebar = el( be.InspectorControls, null,
				el( c.PanelBody, { title: __( 'Scene', 'cle-ai' ) },
					el( c.SelectControl, {
						label: __( 'Marker style', 'cle-ai' ),
						value: a.markerStyle,
						options: [
							{ label: __( 'Numbered', 'cle-ai' ), value: 'numbered' },
							{ label: __( 'Dot', 'cle-ai' ), value: 'dot' },
							{ label: __( 'Question mark', 'cle-ai' ), value: 'question' },
							{ label: __( 'Icon', 'cle-ai' ), value: 'icon' },
						],
						onChange: function ( v ) { props.setAttributes( { markerStyle: v } ); },
					} ),
					el( c.TextareaControl, {
						label: __( 'Image alt text', 'cle-ai' ),
						help: __( 'Leave blank to use the alt text from the Media Library.', 'cle-ai' ),
						value: a.imageAlt,
						onChange: function ( v ) { props.setAttributes( { imageAlt: v } ); },
					} )
				),
				el( c.PanelBody, { title: __( 'Markers', 'cle-ai' ) },
					spots.length ? null : el( 'p', null, __( 'No markers yet. Use "Add marker" in the toolbar, then click the image.', 'cle-ai' ) ),
					spots.map( function ( s, i ) {
						return el( 'div', { key: s.id || i, style: { paddingBottom: '8px' } },
							el( 'hr' ),
							el( 'strong', null, ( i + 1 ) + '. ' + ( plain( s.title ) || __( '(untitled)', 'cle-ai' ) ) ),
							'icon' === a.markerStyle ? el( c.SelectControl, {
								label: __( 'Icon', 'cle-ai' ),
								value: s.icon || 'chat',
								options: ICONS.map( function ( k ) { return { label: k, value: k }; } ),
								onChange: function ( v ) { update( i, { icon: v } ); },
							} ) : null,
							el( c.Flex, { align: 'flex-end' },
								el( c.TextControl, {
									label: __( 'X %', 'cle-ai' ), type: 'number', min: 0, max: 100, step: 0.5, value: s.x,
									onChange: function ( v ) { update( i, { x: clamp( parseFloat( v ) || 0 ) } ); },
								} ),
								el( c.TextControl, {
									label: __( 'Y %', 'cle-ai' ), type: 'number', min: 0, max: 100, step: 0.5, value: s.y,
									onChange: function ( v ) { update( i, { y: clamp( parseFloat( v ) || 0 ) } ); },
								} )
							),
							el( c.Flex, { justify: 'flex-start' },
								el( c.Button, { icon: 'arrow-up-alt2', label: __( 'Move up', 'cle-ai' ), size: 'small', disabled: 0 === i, onClick: function () { move( i, -1 ); } } ),
								el( c.Button, { icon: 'arrow-down-alt2', label: __( 'Move down', 'cle-ai' ), size: 'small', disabled: i === spots.length - 1, onClick: function () { move( i, 1 ); } } ),
								el( c.Button, { variant: 'link', onClick: function () { setOpen( i ); } }, __( 'Edit text', 'cle-ai' ) ),
								el( c.Button, { variant: 'link', isDestructive: true, onClick: function () { remove( i ); } }, __( 'Delete', 'cle-ai' ) )
							)
						);
					} )
				)
			);

			var toolbar = el( be.BlockControls, { group: 'other' },
				el( c.ToolbarButton, {
					icon: 'location',
					label: __( 'Add marker', 'cle-ai' ),
					showTooltip: true,
					isPressed: placing,
					disabled: ! a.imageId,
					onClick: function () { setPlacing( ! placing ); setOpen( null ); },
				}, __( 'Add marker', 'cle-ai' ) ),
				a.imageId ? el( be.MediaReplaceFlow, {
					mediaId: a.imageId,
					mediaURL: media ? media.source_url : '',
					allowedTypes: [ 'image' ],
					accept: 'image/*',
					onSelect: pickImage,
					name: __( 'Replace image', 'cle-ai' ),
				} ) : null
			);

			var editor = open !== null ? spots[ open ] : null;
			var frame = a.imageId
				? el( 'figure', { className: 'cle-scene__frame cle-hotspots', ref: frameRef, onClick: onFrameClick },
					media
						? el( 'img', { className: 'cle-scene__img', src: media.source_url, alt: '', width: media.media_details.width, height: media.media_details.height, draggable: false } )
						: el( c.Spinner ),
					spots.map( function ( s, i ) {
						return el( 'button', {
							key: s.id || i,
							type: 'button',
							className: 'cle-scene__pin',
							style: { '--x': s.x + '%', '--y': s.y + '%' },
							'aria-expanded': open === i,
							'aria-label': plain( s.title ) || __( 'Marker', 'cle-ai' ) + ' ' + ( i + 1 ),
							onPointerDown: startDrag( i ),
							onClick: function ( e ) {
								if ( 0 === e.detail ) {
									setOpen( open === i ? null : i ); // Keyboard activation.
								}
							},
						}, marker( a.markerStyle, s, i ) );
					} ),
					editor ? el( 'div', {
						className: 'cle-scene__pop ' + ( editor.y < 50 ? 'is-below' : 'is-above' ),
						style: { '--x': editor.x + '%', '--y': editor.y + '%' },
						onClick: function ( e ) { e.stopPropagation(); },
						onPointerDown: function ( e ) { e.stopPropagation(); },
					},
						el( be.RichText, {
							tagName: 'h3',
							value: editor.title,
							allowedFormats: [ 'core/bold', 'core/italic' ],
							placeholder: __( 'Marker title', 'cle-ai' ),
							onChange: function ( v ) { update( open, { title: v } ); },
						} ),
						el( be.RichText, {
							tagName: 'p',
							value: editor.body,
							placeholder: __( 'A short note', 'cle-ai' ),
							onChange: function ( v ) { update( open, { body: v } ); },
						} ),
						el( c.Flex, { justify: 'space-between', style: { marginTop: '8px' } },
							el( c.Button, { variant: 'link', isDestructive: true, onClick: function () { remove( open ); } }, __( 'Delete', 'cle-ai' ) ),
							el( c.Button, { variant: 'secondary', size: 'small', onClick: function () { setOpen( null ); } }, __( 'Done', 'cle-ai' ) )
						)
					) : null
				)
				: el( be.MediaPlaceholder, {
					icon: 'format-image',
					labels: {
						title: __( 'Hotspot Scene', 'cle-ai' ),
						instructions: __( 'Choose an illustration or photo. Then use "Add marker" in the toolbar and click the image to pin notes to it.', 'cle-ai' ),
					},
					accept: 'image/*',
					allowedTypes: [ 'image' ],
					onSelect: pickImage,
				} );

			return el( 'section', blockProps,
				sidebar,
				toolbar,
				el( 'div', { className: 'cle-scene__intro' },
					el( be.RichText, {
						tagName: 'h2',
						value: a.heading,
						placeholder: __( 'Scene heading', 'cle-ai' ),
						onChange: function ( v ) { props.setAttributes( { heading: v } ); },
					} ),
					el( be.RichText, {
						tagName: 'p',
						value: a.intro,
						placeholder: __( 'Introduce the scene. Put anything essential (like an address) here too, not only in a marker.', 'cle-ai' ),
						onChange: function ( v ) { props.setAttributes( { intro: v } ); },
					} )
				),
				placing ? el( c.Notice, { status: 'info', isDismissible: false }, __( 'Click the image where the new marker should go.', 'cle-ai' ) ) : null,
				frame,
				el( 'div', innerProps )
			);
		},
		save: function () {
			return el( wp.blockEditor.InnerBlocks.Content );
		},
	} );
} )( window.wp );
