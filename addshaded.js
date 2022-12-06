addshadedfield(id,layer){

    let plottype=layer.plottype
    let lonlatGrid = layer['projDict']['lonlatGrid']
    let field = layer['fields'][0]
    let nvalues = layer['data'][0].nvalue

    let colorbar_used = layer['colorbar_used']
    let c_bar=dic_fields[field]['plots']['colorbar_colors_'+colorbar_used]

    var idx=layer['projDict']['key']
    let updateonly=false
    if ( vertices[idx] ){
        updateonly=true
    }
    else {
        vertices[idx]=[]
    }


    //Get colors 
    var colors=[]
    c_bar.forEach(c => {
        colors.push(...Utilities.string_to_rgb(c))
    });

    
    var t0 = performance.now()
    var elevation= plotorder[plottype].elevation
    let Datavalues = new Float32Array( (nvalues.length-1)*(nvalues[0].length-1)*12 )
    let k = 0
    for ( var j=0; j<nvalues.length-1; j++ ){
        for ( var i=0; i<nvalues[j].length-1; i++ ){        
            if ( ! updateonly ){

                //   p1--------p2
                //   |          |
                //   |----p5----|
                //   |          |
                //   p3--------p4
                //
                //make a square with four trianges (need 4 points)
                let pt1=[lonlatGrid[j  ][i  ][0],lonlatGrid[j  ][i  ][1],elevation]  //top left
                let pt2=[lonlatGrid[j  ][i+1][0],lonlatGrid[j  ][i+1][1],elevation]  //top right
                let pt3=[lonlatGrid[j+1][i  ][0],lonlatGrid[j+1][i  ][1],elevation]  //bottom left
                let pt4=[lonlatGrid[j+1][i+1][0],lonlatGrid[j+1][i+1][1],elevation]  //bottom right
                let pt5=[(pt1[0]+pt2[0]+pt3[0]+pt4[0])/4      ,(pt1[1]+pt2[1]+pt3[1]+pt4[1])/4      ,elevation]  //center point
        
                //Make 4 triangles
                vertices[idx].push(...pt2,...pt1,...pt5, ...pt2,...pt5,...pt4, ...pt4,...pt5,...pt3, ...pt3,...pt5,...pt1)
            }

            //Make data array
            let d1 = nvalues[j  ][i]
            let d2 = nvalues[j  ][i+1]
            let d3 = nvalues[j+1][i]
            let d4 = nvalues[j+1][i+1]
            let d5 = (d1+d2+d3+d4)/4

            Datavalues[k+0 ] = d2
            Datavalues[k+1 ] = d1
            Datavalues[k+2 ] = d5

            Datavalues[k+3 ] = d2
            Datavalues[k+4 ] = d5
            Datavalues[k+5 ] = d4

            Datavalues[k+6 ] = d4
            Datavalues[k+7 ] = d5
            Datavalues[k+8 ] = d3

            Datavalues[k+9 ] = d3
            Datavalues[k+10] = d5
            Datavalues[k+11] = d1

            //This is much slower, don't use it
            //Datavalues.push(d2,d1,d5, d2,d5,d4, d4,d5,d3, d3,d5,d1)

            k += 12
        }
    }
    
    if ( ! updateonly ){
        var indicies = []
        for ( var i=0; i<vertices[idx].length; i+=9){
            indicies.push(i/3)
        }

        startIndices[idx] = new Uint32Array(indicies)
        vertices[idx] = new Float32Array(vertices[idx])
    }

    let ctype = GL.NEAREST
    if ( dic_fields[field]['plots']['colorbar_'+colorbar_used] == 'linear' ){
        ctype = GL.LINEAR
    }

    const webGLcontext = this.getWebGLcontext()
    const texture = new Texture2D(webGLcontext, {
        width: colors.length/4,
        height: 1,
        format: GL.RGBA,
        data: new Uint8Array(colors),
        parameters: {
          [GL.TEXTURE_MAG_FILTER]: ctype,
          [GL.TEXTURE_MIN_FILTER]: ctype,
          [GL.TEXTURE_WRAP_S]: GL.CLAMP_TO_EDGE,
          [GL.TEXTURE_WRAP_T]: GL.CLAMP_TO_EDGE
        },
        pixelStore: {
          [GL.UNPACK_FLIP_Y_WEBGL]: true
        },
        mipmaps: true
    });

    const polygonLayer = new DESIPolygonLayer({
    id: id,
    texture: texture,
    data: {
        length: startIndices[idx].length,
        startIndices: startIndices[idx],
        attributes: {
            getPolygon:   {value: vertices[idx], size: 3},
            getPolygonData: {value: Datavalues, size: 1},
        }
    },
    //positionFormat: 'XYZ',
    _normalize: false,
    extruded: false,
    pickable: true,
    onHover: (info, event) => this.readout(info,event),
    wireframe: false //will only work if extruded is true and linecolor or fillcolor are set
    });
    this.addlayer(polygonLayer,id)
}
