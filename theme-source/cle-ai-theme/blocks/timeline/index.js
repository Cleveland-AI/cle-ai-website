( function ( wp ) {
	var el = wp.element.createElement;
	var __ = wp.i18n.__;
	var c = wp.components;
	var be = wp.blockEditor;

	wp.blocks.registerBlockType( 'cle/timeline', {
		edit: function ( props ) {
			var a = props.attributes;
			var list = a.milestones || [];
			var save = function ( next ) { props.setAttributes( { milestones: next } ); };
			var update = function ( i, patch ) {
				var next = list.slice();
				next[ i ] = Object.assign( {}, next[ i ], patch );
				save( next );
			};
			var add = function () {
				save( list.concat( [ {
					date: new Date().toISOString().slice( 0, 10 ),
					label: '', title: '', body: '', tag: '', major: false, next: false,
				} ] ) );
			};
			var field = function ( i, key, label, type ) {
				return el( c.TextControl, {
					label: label,
					type: type || 'text',
					value: list[ i ][ key ] || '',
					onChange: function ( v ) { var o = {}; o[ key ] = v; update( i, o ); },
				} );
			};
			var toggle = function ( i, key, label ) {
				return el( c.ToggleControl, {
					label: label,
					checked: !! list[ i ][ key ],
					onChange: function ( v ) { var o = {}; o[ key ] = v; update( i, o ); },
				} );
			};

			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null,
					el( c.PanelBody, { title: __( 'Timeline', 'cle-ai' ) },
						el( c.ToggleControl, {
							label: __( 'Also show Meetup events', 'cle-ai' ),
							checked: a.includeEvents,
							onChange: function ( v ) { props.setAttributes( { includeEvents: v } ); },
						} ),
						el( c.TextControl, {
							label: __( 'Event tag text', 'cle-ai' ),
							value: a.eventLabel,
							onChange: function ( v ) { props.setAttributes( { eventLabel: v } ); },
						} ),
						el( c.TextControl, {
							label: __( 'First year on the axis', 'cle-ai' ),
							type: 'number',
							value: a.startYear,
							onChange: function ( v ) { props.setAttributes( { startYear: parseInt( v, 10 ) || 2010 } ); },
						} ),
						el( 'p', null, __( 'Milestones are placed by date, so changing a date moves it. Edit titles and text directly in the block.', 'cle-ai' ) ),
						el( c.Button, { variant: 'secondary', onClick: add }, __( 'Add milestone', 'cle-ai' ) )
					),
					list.map( function ( m, i ) {
						return el( c.PanelBody, {
							key: i,
							initialOpen: false,
							title: ( m.label || m.date ) + ' · ' + ( m.title || '' ).replace( /<[^>]+>/g, '' ),
						},
							field( i, 'date', __( 'Date', 'cle-ai' ), 'date' ),
							field( i, 'label', __( 'Date as shown (e.g. "July 2025")', 'cle-ai' ) ),
							field( i, 'tag', __( 'Tag (optional)', 'cle-ai' ) ),
							toggle( i, 'major', __( 'Major milestone', 'cle-ai' ) ),
							toggle( i, 'next', __( 'Highlight as next up', 'cle-ai' ) ),
							el( c.Button, {
								isDestructive: true,
								variant: 'link',
								onClick: function () { save( list.filter( function ( x, k ) { return k !== i; } ) ); },
							}, __( 'Remove milestone', 'cle-ai' ) )
						);
					} )
				),
				el( 'ol', { className: 'cle-timeline__items' },
					list.map( function ( m, i ) {
						return el( 'li', { key: i, className: 'cle-timeline__item' + ( m.major ? ' is-major' : '' ) + ( m.next ? ' is-next' : '' ) },
							el( 'span', { className: 'cle-timeline__marker' } ),
							el( 'div', { className: 'cle-timeline__card' },
								el( 'p', { className: 'cle-timeline__date' },
									m.label || m.date,
									m.tag ? el( 'span', { className: 'cle-timeline__tag' }, m.tag ) : null
								),
								el( be.RichText, {
									tagName: 'h3',
									className: 'cle-timeline__title',
									value: m.title,
									allowedFormats: [ 'core/bold', 'core/italic' ],
									placeholder: __( 'Milestone title', 'cle-ai' ),
									onChange: function ( v ) { update( i, { title: v } ); },
								} ),
								el( be.RichText, {
									tagName: 'p',
									className: 'cle-timeline__body',
									value: m.body,
									placeholder: __( 'What happened?', 'cle-ai' ),
									onChange: function ( v ) { update( i, { body: v } ); },
								} )
							)
						);
					} )
				),
				el( c.Button, { variant: 'secondary', onClick: add }, __( 'Add milestone', 'cle-ai' ) )
			);
		},
	} );
} )( window.wp );
