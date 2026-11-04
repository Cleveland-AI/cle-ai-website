/**
 * Sidebar editor for a block attribute that is a list of objects (perks, gift steps,
 * milestones, team members, map pins). Each item gets its own fields plus up/down/remove,
 * and the panel ends with an "Add" button.
 *
 * window.cleArrayPanel( props, key, { title, itemLabel, fields: [ { key, label, type } ], blank } )
 *   type: 'text' (default) | 'textarea' | 'number' | 'toggle'
 */
( function ( wp ) {
	var el = wp.element.createElement;
	var c = wp.components;
	var __ = wp.i18n.__;

	window.cleArrayPanel = function ( props, key, opts ) {
		var items = props.attributes[ key ] || [];
		var save = function ( next ) { var o = {}; o[ key ] = next; props.setAttributes( o ); };
		var setField = function ( i, field, value ) {
			var next = items.slice();
			next[ i ] = Object.assign( {}, next[ i ] );
			next[ i ][ field ] = value;
			save( next );
		};
		var move = function ( i, d ) {
			var j = i + d;
			if ( j < 0 || j >= items.length ) {
				return;
			}
			var next = items.slice();
			var t = next[ i ];
			next[ i ] = next[ j ];
			next[ j ] = t;
			save( next );
		};
		var field = function ( item, i, f ) {
			var common = { key: f.key, label: f.label, __nextHasNoMarginBottom: true };
			if ( 'toggle' === f.type ) {
				return el( c.ToggleControl, Object.assign( common, { checked: !! item[ f.key ], onChange: function ( v ) { setField( i, f.key, v ); } } ) );
			}
			if ( 'textarea' === f.type ) {
				return el( c.TextareaControl, Object.assign( common, { value: item[ f.key ] || '', onChange: function ( v ) { setField( i, f.key, v ); } } ) );
			}
			return el( c.TextControl, Object.assign( common, {
				type: 'number' === f.type ? 'number' : 'text',
				value: undefined === item[ f.key ] ? '' : item[ f.key ],
				onChange: function ( v ) { setField( i, f.key, 'number' === f.type ? parseFloat( v ) || 0 : v ); },
			} ) );
		};
		return el( c.PanelBody, { title: opts.title, initialOpen: false },
			items.map( function ( item, i ) {
				return el( 'div', { key: i, style: { borderTop: '1px solid #ddd', padding: '12px 0', display: 'grid', gap: '8px' } },
					el( 'strong', null, ( opts.itemLabel || __( 'Item', 'cle-ai' ) ) + ' ' + ( i + 1 ) ),
					opts.fields.map( function ( f ) { return field( item, i, f ); } ),
					el( c.Flex, { justify: 'flex-start' },
						el( c.Button, { variant: 'tertiary', size: 'small', disabled: 0 === i, onClick: function () { move( i, -1 ); } }, __( 'Move up', 'cle-ai' ) ),
						el( c.Button, { variant: 'tertiary', size: 'small', disabled: i === items.length - 1, onClick: function () { move( i, 1 ); } }, __( 'Move down', 'cle-ai' ) ),
						el( c.Button, { variant: 'tertiary', size: 'small', isDestructive: true, onClick: function () { save( items.filter( function ( x, k ) { return k !== i; } ) ); } }, __( 'Remove', 'cle-ai' ) )
					)
				);
			} ),
			el( c.Button, { variant: 'secondary', onClick: function () { save( items.concat( [ Object.assign( {}, opts.blank || {} ) ] ) ); } }, __( 'Add', 'cle-ai' ) + ' ' + ( opts.itemLabel || __( 'item', 'cle-ai' ) ).toLowerCase() )
		);
	};

	/** Standard edit(): sidebar panels plus a live server-rendered preview. */
	window.cleServerEdit = function ( name, panels ) {
		return function ( props ) {
			var be = wp.blockEditor;
			return el( 'div', be.useBlockProps(),
				el( be.InspectorControls, null, panels( props ) ),
				el( wp.serverSideRender, { block: name, attributes: props.attributes } )
			);
		};
	};
} )( window.wp );
