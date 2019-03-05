// input queue manager
function processInputs (q, commands) {
    while (q.length) {
        var input = q.shift()
        if (input in commands) {
            commands[input]()
        }
    }
}

function gcd(x, y) {
  while(y) {
    var t = y;
    y = x % y;
    x = t;
  }
  return x;
}

function lcm(x, y) {
    return x * y / gcd(x, y);
}

// sprite animation
function Sprite (img, w, h, ax, ay, d) {
    this.delay = d || 10
    this.dc = 0
    this.img = img
    this.w = w
    this.h = h
    this.ax = ax
    this.ay = ay
    this.c = 0
    this.lcm = (function() {
        return lcm(ax.length, ay.length)
    })()
}

Sprite.prototype.next = function (ctx, x, y, w, h, f) {
    this.dc++
    if (this.dc >= this.delay) {
        this.dc = 0
        this.c++
        if (this.c >= this.lcm) this.c = 0
    }
    if (f != undefined) this.c = f
    ctx.drawImage(this.img, this.ax[this.c % this.ax.length], this.ay[this.c % this.ay.length], this.w, this.h, x, y, w, h)
};

function getWindowDim() {
    var w = window,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0],
        x = w.innerWidth || e.clientWidth || g.clientWidth,
        y = w.innerHeight|| e.clientHeight|| g.clientHeight;
    return [x,y]
}

// initialize
function init() {
    var cvs = document.querySelector('#game')
    const [w,h] = getWindowDim()
    cvs.width = w;
    cvs.height = h;

    var game = {
        h: cvs.height,
        w: cvs.width,
        ctx: cvs.getContext('2d'),
        states: [],
        state: "menu",
        inq: [], // input queue
        save: {},
        first: true
    }

    console.log(game);

    var size = 64
    var c = 4

    var gridw = Math.ceil(Math.floor(game.w / size) / 2) * 2 + 4
    var gridh = Math.ceil(Math.floor(game.h / size) / 2) * 2 + 4

    var vradius = (gridh - 4)/2

    // generator states (this is beautiful)

    game.states["menu"] = (function*(g){
        var floating = 0 // floating title text
        var pos = 0 // selector position
        var fade = 0 // fade to black (press play)
        var choices = ["play","options"]
        var ctx = g.ctx

        var offy = g.h/2

        while (true) {
            if (fade) { // selected play
                ctx.fillStyle = "rgba(0,0,0,.05)"
                ctx.fillRect(0,0,g.w,g.h)
                fade++
                if (fade > 85) {
                    g.state = "gen" // change state to gen
                    pos = 0
                    fade = 0
                }
            } else {
                // process the inputs first
                processInputs(g.inq,{
                    87: function() { // w
                        pos -= 1
                        if (pos < 0) pos += choices.length
                    },
                    83: function() { // s
                        pos += 1
                        if (pos >= choices.length) pos -= choices.length
                    },
                    13: function() { // enter
                        switch (choices[pos]) {
                            case "play":
                                fade++
                                break
                            case "options":
                                g.state = "options"
                                break
                        }
                    }
                })
                ctx.fillStyle = "black"
                ctx.fillRect(0,0,g.w,g.h) // background
                ctx.textAlign = "left"
                ctx.fillStyle = "white"
                ctx.font = "30px arcade"

                floating+=0.02
                if (floating >= 2) floating = 0
                ctx.fillText("minotaur",g.w/2,offy+Math.sin(floating*Math.PI)*7) // title text

                ctx.font = "20px arcade"
                for (var i = 0 ; i < choices.length ; i++) { // choices
                    ctx.fillText(choices[i],g.w/2 ,offy+75+i*50)
                }
                ctx.fillText(">", g.w/2 - 40,offy+75+pos*50) // selector
            }
            yield
        }
    })(game)

    game.states["options"] = (function*(g){
        var ctx = g.ctx
        var fade = 0
        while (true) {
            if (fade) {
                ctx.fillStyle = "rgba(0,0,0,.05)"
                ctx.fillRect(0,0,g.w,g.h)
                fade++
                if (fade > 85) {
                    g.state = "menu" // change state to gen
                    fade = 0
                }
            } else {
                ctx.fillStyle = "black"
                ctx.fillRect(0,0,g.w,g.h)
                processInputs(g.inq, {
                    13: function() {
                        fade++
                    }
                })
                ctx.fillStyle = "white"
                ctx.textAlign = "center"
                ctx.fillText("Nothing here yet, go back!", g.w/2, g.h/2)
                ctx.fillText("> back", g.w/2, g.h*2/3)
            }
            yield
        }
    })(game)

    // generate map
    // http://www.gamasutra.com/blogs/AAdonaac/20150903/252889/Procedural_Dungeon_Generation_Algorithm.php
    game.states["gen"] = (function*(g){

        g.ctx.fillStyle = "black"
        g.ctx.fillRect(0,0,g.w,g.h)

        var rects = []

        // preliminary room gen
        for (var i = 0 ; i < 200 ; i++) {
            var p = randInCircle()
            var ar = nRand(5) * 3 - 1
            if (ar < 0 ) continue
            var w = Math.random()*35 + 15
            var h = w * ar
            w = snapTo(w,c)
            h = snapTo(h,c)
            if (w == 0 || h == 0) continue
            if (Math.random() < 0.5) {
                var tmp = w
                w = h
                h = tmp
            }
            var x = snapTo(p[0]*60-w/2,c)
            var y = snapTo(p[1]*60-h/2,c)
            rects.push({
                i: i,
                x: x,
                y: y,
                w: w,
                h: h
            })
        }

        var colliding = true

        while (colliding) { // resolve collisions
            colliding = false
            for (var i = 0 ; i < rects.length ; i++ ) {
                var vx = 0
                var vy = 0
                for (var j = 0 ; j < rects.length ; j++) {
                    if (i == j) continue
                    if (dir = detectCollision(rects[i],rects[j])) {
                        colliding = true
                        switch (dir) {
                            case 1: vy--;break //top
                            case 2: vy++;break //bottom
                            case 3: vx--;break //left
                            case 4: vx++;break //right
                        }
                    }
                }
                if (vx != 0 || vy != 0) {
                    rects[i].x += vx*c
                    rects[i].y += vy*c
                }
            }
        }

        // sort rooms by size
        rects.sort(function(a,b) {
            return b.w*b.h - a.w*a.h
        })

        var large = []

        var minx = Infinity
        var maxx = -Infinity
        var miny = Infinity
        var maxy = -Infinity

        var graph = new Graph()

        // add largest rooms to graph
        for (var i = 0 ; i < 30 ; i++) {
            var rect = rects[i]
            large.push(rect)
            graph.setNode(i, rect)
        }

        // find dimensions of map
        for (var i = 0 ; i < large.length ; i++) {
            var x = large[i].x
            var y = large[i].y
            var w = large[i].w
            var h = large[i].h

            if (x < minx) minx = x
            if (x + w > maxx) maxx = x + w
            if (y < miny) miny = y
            if (y + h > maxy) maxy = y + h
        }

        miny -= c * vradius
        minx -= c * vradius

        var map = []
        var mw = (maxx - minx) / c + vradius
        var mh = (maxy - miny) / c + vradius

        function texture(n) {
            return Math.floor(Math.random()*n)+1
        }

        // map initialization
        for (var i = 0 ; i < mh ; i++) {
            map[i] = []
            for (var j = 0 ; j < mw ; j++) {
                map[i][j] = -1*texture(4) // -1,-2,-3,-4
            }
        }

        // add large rooms to map
        for (var i = 0 ; i < large.length ; i++) {
            var r = large[i]
            for (var j = 0 ; j < r.h/c ; j++) {
                for (var k = 0 ; k < r.w/c ; k++) {
                    map[j+r.y/c-miny/c][k+r.x/c-minx/c] = texture(8)
                }
            }
        }

        // triangulate large rooms
        var triangles = Delaunay.triangulate(large.map(center));

        for(i = triangles.length; i; ) {
            graph.connect(triangles[i-1],triangles[i-2])
            graph.connect(triangles[i-2],triangles[i-3])
            graph.connect(triangles[i-3],triangles[i-1])
            i -= 3
            yield
        }

        // find minimum spanning tree
        var mst = kruskalMST(graph, function(a) {
            var r1 = a[0].label
            var r2 = a[1].label
            var dx = r1.x+r1.w-r2.x-r2.w
            var dy = r1.y+r1.h-r2.y-r2.h
            return dx*dx+dy*dy
        })

        // randomly add back some edges
        for (var i = 0 ; i < graph.edges.length * 0.15 ; i++ ){
            var e = graph.edges[Math.floor(Math.random()*graph.edges.length)]
            mst.connect(e[0].id,e[1].id)
        }

        // hallway connections
        for (var i = 0 ; i < mst.edges.length ; i++) {
            var r1 = mst.edges[i][0].label
            var r2 = mst.edges[i][1].label
            var c1 = center(r1)
            var c2 = center(r2)
            c1 = [snapTo(c1[0],c),snapTo(c1[1],c)]
            c2 = [snapTo(c2[0],c),snapTo(c2[1],c)]
            var m = [(c1[0]+c2[0])/2,(c1[1]+c2[1])/2]
            m = [snapTo(m[0],c),snapTo(m[1],c)]

            if ( ( r1.x < r2.x ) ? ( m[0] > r2.x && r1.x + r1.w > m[0] ) : ( m[0] > r1.x && r2.x + r2.w > m[0] ) ) { // vertical

                var lower = Math.min(c1[1],c2[1])
                var upper = Math.max(c1[1],c2[1])

                for (var k = -1 ; k < 2 ; k++) {
                    for (var j = lower/c ; j <= upper/c ; j++) {
                        map[j-miny/c][m[0]/c-minx/c+k] = texture(8)
                    }
                }
            } else if ( ( r1.y < r2.y ) ? ( m[1] > r2.y && r1.y + r1.h > m[1] ) : ( m[1] > r1.y && r2.y + r2.h > m[1] ) ) { // horizontal

                var lower = Math.min(c1[0],c2[0])
                var upper = Math.max(c1[0],c2[0])

                for (var k = -1 ; k < 2 ; k++) {
                    for (var j = lower/c ; j <= upper/c ; j++) {
                        map[m[1] / c - miny / c + k][j - minx / c] = texture(8)
                    }
                }
            } else { // L shaped hallway
                var coin = Math.round(Math.random())

                var lower = Math.min(c1[0],c2[0])
                var upper = Math.max(c1[0],c2[0])

                for (var k = -1 ; k < 2 ; k++) { // horizontal arm
                    for (var j = lower/c ; j <= upper/c ; j++) {
                        map[(coin?c2:c1)[1] / c - miny / c + k][j - minx / c] = texture(8)
                    }
                }

                lower = Math.min(c1[1],c2[1])
                upper = Math.max(c1[1],c2[1])

                for (var k = -1 ; k < 2 ; k++) { // vertical arm
                    for (var j = lower/c-1 ; j <= upper/c+1 ; j++) {
                        map[j-miny/c][(coin?c1:c2)[0]/c-minx/c+k] = texture(8)
                    }
                }
            }
        }

        var px, py

        // initialize player position
        do {
            px = Math.floor(Math.random()*map[0].length)
            py = Math.floor(Math.random()*map.length)
        } while (map[py][px] < 0)

        // place drops
        for (var i = 0 ; i < 100 ; i++) {
            var drop = Math.floor(Math.random()*2)+1
            var dropx, dropy
            do {
                dropx = Math.floor(Math.random()*map[0].length)
                dropy = Math.floor(Math.random()*map.length)
            } while (map[dropy][dropx] < 0 || map[dropy][dropx] > 100)
            map[dropy][dropx] += drop * 100
        }

        g.save.map = map

        g.save.player = {}

        g.save.player.x = px
        g.save.player.y = py

        g.save.player.health = 1
        g.save.player.stamina = 1

        g.sprites = {}
        g.sprites.player = {} // player sprites

        var rogueSheet = new Image();
        rogueSheet.src = "assets/rogue.png"

        var tx = []
        for (var i = 0 ; i < 10 ; i++) {
            tx.push(i*32+1)
        }

        g.sprites.player.idle = new Sprite(rogueSheet, 32, 32, tx, [0], 15)
        g.sprites.player.gesture = new Sprite(rogueSheet, 32, 32, tx, [1*32])
        g.sprites.player.walk = new Sprite(rogueSheet, 32, 32, tx, [2*32], 8)
        g.sprites.player.attack = new Sprite(rogueSheet, 32, 32, tx, [3*32])
        g.sprites.player.death = new Sprite(rogueSheet, 32, 32, tx, [4*32])

        var shadow = new Image()
        shadow.src = "assets/shadow.png"

        g.sprites.player.shadow = new Sprite(shadow, 16,16, [0],[0])

        var glow = new Image()
        glow.src = "assets/glow.png"

        g.sprites.player.glow = new Sprite(glow,128,128,[0],[0])

        var rogue_icon = new Image()
        rogue_icon.src = "assets/rogue_icon.png"

        g.sprites.player.icon = new Sprite(rogue_icon,6,6,[0],[0])

        var floor = new Image();
        floor.src = "assets/dungeon_floor.png"

        g.sprites.floor = [] // floor sprites

        // 012
        // 3 4 -> floor["01234567".toDecimal()]
        // 567

        g.sprites.floor[0] = new Sprite(floor,16,16,[0,16,32,48,64,96,112,128],[0,32,32,32,32,32,32,32]) // 00000000
        g.sprites.floor[1] = new Sprite(floor,16,16,[352],[16])             // 00000001
        g.sprites.floor[2] = new Sprite(floor,16,16,[176,192,208],[0])      // 00000010
        g.sprites.floor[4] = new Sprite(floor,16,16,[336],[16])             // 00000100
        g.sprites.floor[5] = new Sprite(floor,16,16,[416],[16])             // 00000101
        g.sprites.floor[8] = new Sprite(floor,16,16,[224,240,256],[0])      // 00001000
        g.sprites.floor[10] = new Sprite(floor,16,16,[64],[0])              // 00001010
        g.sprites.floor[12] = new Sprite(floor,16,16,[16],[16])             // 00001100
        g.sprites.floor[16] = new Sprite(floor,16,16,[80,96,112],[0])       // 00010000
        g.sprites.floor[17] = new Sprite(floor,16,16,[0],[16])              // 00010001
        g.sprites.floor[18] = new Sprite(floor,16,16,[48],[0])              // 00010010
        g.sprites.floor[24] = new Sprite(floor,16,16,[368,384],[0])         // 00011000
        g.sprites.floor[26] = new Sprite(floor,16,16,[320],[0])             // 00011010
        g.sprites.floor[32] = new Sprite(floor,16,16,[320],[16])            // 00100000
        g.sprites.floor[33] = new Sprite(floor,16,16,[400],[16])            // 00100001
        g.sprites.floor[34] = new Sprite(floor,16,16,[64],[16])             // 00100010
        g.sprites.floor[36] = new Sprite(floor,16,16,[208],[16])            // 00100100
        g.sprites.floor[37] = new Sprite(floor,16,16,[256],[16])            // 00100101
        g.sprites.floor[48] = new Sprite(floor,16,16,[32],[16])             // 00110000
        g.sprites.floor[49] = new Sprite(floor,16,16,[144],[16])            // 00110001
        g.sprites.floor[50] = new Sprite(floor,16,16,[448],[0])             // 00110010
        g.sprites.floor[64] = new Sprite(floor,16,16,[128,144,160],[0])     // 01000000
        g.sprites.floor[65] = new Sprite(floor,16,16,[96],[16])             // 01000001
        g.sprites.floor[66] = new Sprite(floor,16,16,[336,352],[0])         // 01000010
        g.sprites.floor[68] = new Sprite(floor,16,16,[112],[16])            // 01000100
        g.sprites.floor[69] = new Sprite(floor,16,16,[128],[16])            // 01000101
        g.sprites.floor[72] = new Sprite(floor,16,16,[32],[0])              // 01001000
        g.sprites.floor[74] = new Sprite(floor,16,16,[304],[0])             // 01001010
        g.sprites.floor[76] = new Sprite(floor,16,16,[432],[0])             // 01001100
        g.sprites.floor[80] = new Sprite(floor,16,16,[16],[0])              // 01010000
        g.sprites.floor[81] = new Sprite(floor,16,16,[416],[0])             // 01010001
        g.sprites.floor[82] = new Sprite(floor,16,16,[272],[0])             // 01010010
        g.sprites.floor[88] = new Sprite(floor,16,16,[288],[0])             // 01011000
        g.sprites.floor[90] = new Sprite(floor,16,16,[400],[0])             // 01011010
        g.sprites.floor[128] = new Sprite(floor,16,16,[304],[16])           // 10000000
        g.sprites.floor[129] = new Sprite(floor,16,16,[192],[16])           // 10000001
        g.sprites.floor[130] = new Sprite(floor,16,16,[80],[16])            // 10000010
        g.sprites.floor[132] = new Sprite(floor,16,16,[384],[16])           // 10000100
        g.sprites.floor[133] = new Sprite(floor,16,16,[272],[16])           // 10000101
        g.sprites.floor[136] = new Sprite(floor,16,16,[48],[16])            // 10001000
        g.sprites.floor[138] = new Sprite(floor,16,16,[464],[0])            // 10001010
        g.sprites.floor[140] = new Sprite(floor,16,16,[160],[16])           // 10001100
        g.sprites.floor[160] = new Sprite(floor,16,16,[368],[16])           // 10100000
        g.sprites.floor[161] = new Sprite(floor,16,16,[224],[16])           // 10100001
        g.sprites.floor[162] = new Sprite(floor,16,16,[176],[16])           // 10100010
        g.sprites.floor[164] = new Sprite(floor,16,16,[240],[16])           // 10100100
        g.sprites.floor[165] = new Sprite(floor,16,16,[288],[16])           // 10100101

        var wall = new Image();
        wall.src = "assets/dungeon_wall.png"

        g.sprites.wall = [] // wall sprites

        g.sprites.wall[0] = new Sprite(wall,16,16,[16,32,48,64],[0]) // 00
        g.sprites.wall[1] = new Sprite(wall,16,16,[80],[0]) // 01
        g.sprites.wall[2] = new Sprite(wall,16,16,[0],[0]) // 10
        g.sprites.wall[3] = new Sprite(wall,16,16,[96],[0]) // 11
        g.sprites.wall[4] = new Sprite(wall,16,16,[16,32,48,64],[16]) // 00
        g.sprites.wall[5] = new Sprite(wall,16,16,[80],[16]) // 01
        g.sprites.wall[6] = new Sprite(wall,16,16,[0],[16]) // 10
        g.sprites.wall[7] = new Sprite(wall,16,16,[96],[16]) // 11

        var ceiling = new Image();
        ceiling.src = "assets/dungeon_ceiling.png"

        g.sprites.ceiling = [] // ceiling sprites

        g.sprites.ceiling[0] = new Sprite(ceiling,16,16,[0],[0])                // 00000000
        g.sprites.ceiling[1] = new Sprite(ceiling,16,16,[352],[16])             // 00000001
        g.sprites.ceiling[2] = new Sprite(ceiling,16,16,[176,192,208],[0])      // 00000010
        g.sprites.ceiling[4] = new Sprite(ceiling,16,16,[336],[16])             // 00000100
        g.sprites.ceiling[5] = new Sprite(ceiling,16,16,[416],[16])             // 00000101
        g.sprites.ceiling[8] = new Sprite(ceiling,16,16,[224,240,256],[0])      // 00001000
        g.sprites.ceiling[10] = new Sprite(ceiling,16,16,[64],[0])              // 00001010
        g.sprites.ceiling[12] = new Sprite(ceiling,16,16,[16],[16])             // 00001100
        g.sprites.ceiling[16] = new Sprite(ceiling,16,16,[80,96,112],[0])       // 00010000
        g.sprites.ceiling[17] = new Sprite(ceiling,16,16,[0],[16])              // 00010001
        g.sprites.ceiling[18] = new Sprite(ceiling,16,16,[48],[0])              // 00010010
        g.sprites.ceiling[24] = new Sprite(ceiling,16,16,[368,384],[0])         // 00011000
        g.sprites.ceiling[26] = new Sprite(ceiling,16,16,[320],[0])             // 00011010
        g.sprites.ceiling[32] = new Sprite(ceiling,16,16,[320],[16])            // 00100000
        g.sprites.ceiling[33] = new Sprite(ceiling,16,16,[400],[16])            // 00100001
        g.sprites.ceiling[34] = new Sprite(ceiling,16,16,[64],[16])             // 00100010
        g.sprites.ceiling[36] = new Sprite(ceiling,16,16,[208],[16])            // 00100100
        g.sprites.ceiling[37] = new Sprite(ceiling,16,16,[256],[16])            // 00100101
        g.sprites.ceiling[48] = new Sprite(ceiling,16,16,[32],[16])             // 00110000
        g.sprites.ceiling[49] = new Sprite(ceiling,16,16,[144],[16])            // 00110001
        g.sprites.ceiling[50] = new Sprite(ceiling,16,16,[448],[0])             // 00110010
        g.sprites.ceiling[64] = new Sprite(ceiling,16,16,[128,144,160],[0])     // 01000000
        g.sprites.ceiling[65] = new Sprite(ceiling,16,16,[96],[16])             // 01000001
        g.sprites.ceiling[66] = new Sprite(ceiling,16,16,[336,352],[0])         // 01000010
        g.sprites.ceiling[68] = new Sprite(ceiling,16,16,[112],[16])            // 01000100
        g.sprites.ceiling[69] = new Sprite(ceiling,16,16,[128],[16])            // 01000101
        g.sprites.ceiling[72] = new Sprite(ceiling,16,16,[32],[0])              // 01001000
        g.sprites.ceiling[74] = new Sprite(ceiling,16,16,[304],[0])             // 01001010
        g.sprites.ceiling[76] = new Sprite(ceiling,16,16,[432],[0])             // 01001100
        g.sprites.ceiling[80] = new Sprite(ceiling,16,16,[16],[0])              // 01010000
        g.sprites.ceiling[81] = new Sprite(ceiling,16,16,[416],[0])             // 01010001
        g.sprites.ceiling[82] = new Sprite(ceiling,16,16,[272],[0])             // 01010010
        g.sprites.ceiling[88] = new Sprite(ceiling,16,16,[288],[0])             // 01011000
        g.sprites.ceiling[90] = new Sprite(ceiling,16,16,[400],[0])             // 01011010
        g.sprites.ceiling[128] = new Sprite(ceiling,16,16,[304],[16])           // 10000000
        g.sprites.ceiling[129] = new Sprite(ceiling,16,16,[192],[16])           // 10000001
        g.sprites.ceiling[130] = new Sprite(ceiling,16,16,[80],[16])            // 10000010
        g.sprites.ceiling[132] = new Sprite(ceiling,16,16,[384],[16])           // 10000100
        g.sprites.ceiling[133] = new Sprite(ceiling,16,16,[272],[16])           // 10000101
        g.sprites.ceiling[136] = new Sprite(ceiling,16,16,[48],[16])            // 10001000
        g.sprites.ceiling[138] = new Sprite(ceiling,16,16,[464],[0])            // 10001010
        g.sprites.ceiling[140] = new Sprite(ceiling,16,16,[160],[16])           // 10001100
        g.sprites.ceiling[160] = new Sprite(ceiling,16,16,[368],[16])           // 10100000
        g.sprites.ceiling[161] = new Sprite(ceiling,16,16,[224],[16])           // 10100001
        g.sprites.ceiling[162] = new Sprite(ceiling,16,16,[176],[16])           // 10100010
        g.sprites.ceiling[164] = new Sprite(ceiling,16,16,[240],[16])           // 10100100
        g.sprites.ceiling[165] = new Sprite(ceiling,16,16,[288],[16])           // 10100101

        var hud = new Image()
        hud.src = "assets/hud_top_left.png"

        var fill = new Image()
        fill.src = "assets/fill.png"

        var scroll = new Image()
        scroll.src = "assets/scroll.png"

        var scroll_mask = new Image()
        scroll_mask.src = "assets/scroll_mask.png"

        var drops_sil = new Image()
        drops_sil.src = "assets/drops1_silhouette.png"

        g.sprites.hud = {}

        g.sprites.hud.topleft = new Sprite(hud,192,64,[0],[0])
        g.sprites.hud.hfill = new Sprite(fill,2,8,[0],[0])
        g.sprites.hud.sfill = new Sprite(fill,2,8,[2],[0])
        g.sprites.hud.scroll = new Sprite(scroll,119,90,[0],[0])
        g.sprites.hud.mask = new Sprite(scroll_mask,119,90,[0],[0])
        g.sprites.hud.rope = new Sprite(drops_sil,16,16,[0],[0])
        g.sprites.hud.scrap = new Sprite(drops_sil,16,16,[16],[0])

        var drops = new Image()
        drops.src = "assets/drops1.png"

        g.sprites.drops = []

        g.sprites.drops[0] = new Sprite(drops,16,16,[0],[0])
        g.sprites.drops[1] = new Sprite(drops,16,16,[16],[0])

        // g.sprites.anim = {}
        //
        // g.sprites.anim.collect = function* (type, val) {
        //
        // }

        g.save.player.map = {}

        var mapcvs = document.createElement('canvas');
        mapcvs.width = g.w*0.7
        mapcvs.height = g.h*0.85

        g.save.player.map.ctx = mapcvs.getContext("2d")
        g.save.player.map.ctx.imageSmoothingEnabled = false;

        g.save.player.map.pos = g.h
        g.save.player.map.maxVel = 50
        g.save.player.map.vel = 0
        g.save.player.map.out = false

        g.save.player.inv = {}

        g.save.player.inv.rope = 0
        g.save.player.inv.scraps = 0

        g.state = "play"


        yield

    })(game)

    game.states["play"] = (function*(g){
        var ctx = g.ctx
        var playersprite = g.sprites.player.idle
        var left = false

        g.save.player.xpart = size / 2
        g.save.player.ypart = size / 2

        g.save.player.vel = 4
        var movement = [0,0,0,0] // up, left, down, right

        ctx.imageSmoothingEnabled = false;

        function impassable (m,x,y) {
            return m[y] == undefined || m[y][x] == undefined || m[y][x] < 0
        }

        function walk() {

            if (g.save.player.stamina < 0) {
                g.save.player.vel = 0.5
            } else if (g.save.player.stamina < 0.5) {
                g.save.player.vel = 2
            } else {
                g.save.player.vel = 4
            }

            if (movement[0]) { // attempt to move up
                if (g.save.player.ypart != size / 2) {
                    g.save.player.ypart -= g.save.player.vel
                } else if (!impassable(g.save.map, g.save.player.x, g.save.player.y-1)) {
                    if (g.save.player.xpart == size / 2) {
                        g.save.player.ypart -= g.save.player.vel
                    } else if (!impassable(g.save.map, g.save.player.x+1, g.save.player.y-1)) {
                        g.save.player.ypart -= g.save.player.vel
                    }
                }
            }
            if (movement[1]) { // attempt to move left
                if (g.save.player.xpart != size / 2) {
                    g.save.player.xpart -= g.save.player.vel
                } else if (!impassable(g.save.map, g.save.player.x-1, g.save.player.y)) {
                    if (g.save.player.ypart == size / 2) {
                        g.save.player.xpart -= g.save.player.vel
                    } else if (!impassable(g.save.map, g.save.player.x-1, g.save.player.y+1)) {
                        g.save.player.xpart -= g.save.player.vel
                    }
                }
            }
            if (movement[2]) { // attempt to move down
                if (g.save.player.ypart != size / 2) {
                    g.save.player.ypart += g.save.player.vel
                } else if (!impassable(g.save.map, g.save.player.x, g.save.player.y+1)) {
                    if (g.save.player.xpart == size / 2) {
                        g.save.player.ypart += g.save.player.vel
                    } else if (!impassable(g.save.map, g.save.player.x+1, g.save.player.y+1)) {
                        g.save.player.ypart += g.save.player.vel
                    }
                }
            }
            if (movement[3]) { // attempt to move right
                if (g.save.player.xpart != size / 2) {
                    g.save.player.xpart += g.save.player.vel
                } else if (!impassable(g.save.map, g.save.player.x+1, g.save.player.y)) {
                    if (g.save.player.ypart == size / 2) {
                        g.save.player.xpart += g.save.player.vel
                    } else if (!impassable(g.save.map, g.save.player.x+1, g.save.player.y+1)) {
                        g.save.player.xpart += g.save.player.vel
                    }
                }
            }

            if (movement.indexOf(1) > -1) {
                playersprite = g.sprites.player.walk
                playersprite.delay = 32 / g.save.player.vel
                if (g.save.player.stamina > 0 )g.save.player.stamina -= 0.0002
            } else {
                playersprite = g.sprites.player.idle
                if (g.save.player.stamina < 1) g.save.player.stamina += 0.0001
            }

            if (movement[1] && !movement[3]) {
                left = true
            } else if (movement[3] && !movement[1]) {
                left = false
            }

            // parts constrained to [size * 0.5, size * 1.5)

            if (g.save.player.xpart >=  size*3/2) {
                g.save.player.xpart -= size;
                g.save.player.x++
            }
            if (g.save.player.xpart < size/2) {
                g.save.player.xpart += size;
                g.save.player.x--
            }
            if (g.save.player.ypart >=  size*3/2) {
                g.save.player.ypart -= size;
                g.save.player.y++
            }
            if (g.save.player.ypart < size/2) {
                g.save.player.ypart += size;
                g.save.player.y--
            }

            // pick up drops

            (function() {
                if (g.save.player.xpart > size / 2 && g.save.player.ypart > size / 2) return [[0,0],[1,0],[0,1],[1,1]]
                if (g.save.player.xpart == size / 2 && g.save.player.ypart > size / 2) return [[0,0],[0,1]]
                if (g.save.player.xpart > size / 2 && g.save.player.ypart == size / 2) return [[0,0],[1,0]]
                return [[0,0]]
            })().forEach(function(pair) {
                if (g.save.map[g.save.player.y+pair[1]][g.save.player.x+pair[0]] >= 100) {
                    switch(Math.floor(g.save.map[g.save.player.y+pair[1]][g.save.player.x+pair[0]]/100)) {
                        case 1: // rope
                            g.save.player.inv.rope += 10 + Math.floor(Math.random()*10)
                            break
                        case 2: // scraps
                            g.save.player.inv.scraps += 1 + Math.floor(Math.random()*3)
                            break
                    }
                    g.save.map[g.save.player.y+pair[1]][g.save.player.x+pair[0]] -= Math.floor(g.save.map[g.save.player.y+pair[1]][g.save.player.x+pair[0]]/100)*100
                }
            })

        }

        function drawFloor(a,x,b,y,again) {
            if (!again) {
                var n = [0,0,0,0,0,0,0,0]
                var m = g.save.map
                var count = 0
                for (var i = 1 ; i >= -1 ; i--) {
                    for (var j = 1 ; j >= -1 ; j--) {
                        if (i == 0 && j == 0) continue
                        if (m[b+y+i] == undefined || m[b+y+i][a+x+j] == undefined || m[b+y+i][a+x+j] < 0) { // wall / unpassable
                            n[count] = 1
                        }
                        count++
                    }
                }
                if (n[1] || n[3]) n[0] = 0
                if (n[1] || n[4]) n[2] = 0
                if (n[3] || n[6]) n[5] = 0
                if (n[4] || n[6]) n[7] = 0
                index = n.reduce(function(p,c,i) {
                    return p + c*Math.pow(2,i)
                }, 0)
                g.sprites.floor[index].next(g.ctx,size*a-g.save.player.xpart, size*b-g.save.player.ypart,size,size,m[b+y][a+x]%10)

                if (m[b+y][a+x] >= 100) { // drop at this tile
                    g.sprites.drops[Math.floor(m[b+y][a+x]/100)-1].next(g.ctx,size*a-g.save.player.xpart, size*b-g.save.player.ypart,size,size)
                }
            }

            if (g.save.map[b+y-1] == undefined || g.save.map[b+y-1][a+x] < 0) {
                drawWall(a,x,b-1,y,again)
            }
        }

        function drawWall (a,x,b,y,again) {
            var n = 0
            var m = g.save.map
            if (m[b+y] != undefined && m[b+y][a+x-1] != undefined && m[b+y][a+x-1] > 0) n += 2
            if (m[b+y] != undefined && m[b+y][a+x+1] != undefined && m[b+y][a+x+1] > 0) n += 1
            var t = 0
            if (m[b+y] != undefined && m[b+y][a+x] != undefined) t = (m[b+y][a+x]*-1)%10 -1
            g.sprites.wall[n+(again?0:4)].next(g.ctx,size*a-g.save.player.xpart, size*(b-(again?1:0))-g.save.player.ypart,size,size,t)
        }

        function drawCeiling (a,x,b,y) {
            var n = [0,0,0,0,0,0,0,0]
            var m = g.save.map
            var count = 0
            for (var i = 1 ; i >= -1 ; i--) {
                for (var j = 1 ; j >= -1 ; j--) {
                    if (i == 0 && j == 0) continue
                    if (m[b+y+i] != undefined && m[b+y+i][a+x+j] != undefined && m[b+y+i][a+x+j] > -1) { // wall / unpassable
                        n[count] = 1
                    }
                    count++
                }
            }
            if (n[1] || n[3]) n[0] = 0
            if (n[1] || n[4]) n[2] = 0
            if (n[3] || n[6]) n[5] = 0
            if (n[4] || n[6]) n[7] = 0
            index = n.reduce(function(p,c,i) {
                return p + c*Math.pow(2,i)
            }, 0)
            var t = 0
            if (m[b+y] != undefined && m[b+y][a+x] != undefined) t = (m[b+y][a+x]*-1)%10 - 1
            try {
                g.sprites.ceiling[index].next(g.ctx,size*a-g.save.player.xpart, size*(b-2)-g.save.player.ypart,size,size,t)
            } catch (e) {
                console.log(n, index);
            }

        }

        while (true) {

            walk()

            processInputs(g.inq, {
                87: function() { // w
                    if (!movement[0] && !g.save.player.map.out) movement[0] = 1
                },
                65: function() { // a
                    if (!movement[1] && !g.save.player.map.out) movement[1] = 1
                },
                83: function() { // s
                    if (!movement[2] && !g.save.player.map.out) movement[2] = 1
                },
                68: function() { // d
                    if (!movement[3] && !g.save.player.map.out) movement[3] = 1
                },
                "-87": function() {
                    movement[0] = 0
                },
                "-65": function() {
                    movement[1] = 0
                },
                "-83": function() {
                    movement[2] = 0
                },
                "-68": function() {
                    movement[3] = 0
                },
                77: function() { // m
                    // showMap()
                    movement = [0,0,0,0]
                    g.save.player.map.vel = g.save.player.map.maxVel * (g.save.player.map.out?1:-1)
                    g.save.player.map.out = !g.save.player.map.out
                    g.save.player.map.bounce = (function*() {
                        var speed = 100
                        var count = speed
                        while (true) {
                            if (count-- < 0) {
                                count = speed
                            }
                            yield Math.sin(count/speed*2*Math.PI)/2
                        }
                    })()

                    var xc = g.w*0.70/g.save.map[0].length
                    var yc = g.h*0.85/g.save.map.length

                    var sc = Math.min(xc,yc)

                    g.save.player.map.ctx.clearRect(0,0,g.w*0.7, g.h*0.85)

                    g.save.player.map.ctx.lineWidth = 1

                    for (var i = 0 ; i < g.save.map.length ; i++) {
                        for (var j = 0 ; j < g.save.map[0].length ; j++) {
                            if (g.save.map[i][j] % 100 >= 10) { // location was seen
                                g.save.player.map.ctx.fillStyle = "grey"
                                g.save.player.map.ctx.strokeStyle = "grey"
                                g.save.player.map.ctx.fillRect(j*sc,i*sc,sc,sc)
                                g.save.player.map.ctx.strokeRect(j*sc,i*sc,sc,sc)
                            } else if (g.save.map[i][j] < 0 && (function() {
                                for (var k = -1 ; k < 2 ; k++) {
                                    for (var l = -1 ; l < 2 ; l++) {
                                        if ((k+l)%2==0) continue
                                        if (!impassable(g.save.map,j+l,i+k) && g.save.map[i+k][j+l] % 100 >= 10) { // seen
                                            return true
                                        }
                                    }
                                }
                                return false
                            })()) { // impassable but next to not wall
                                g.save.player.map.ctx.fillStyle = "black"
                                g.save.player.map.ctx.strokeStyle = "black"
                                g.save.player.map.ctx.fillRect(j*sc,i*sc,sc,sc)
                                g.save.player.map.ctx.strokeRect(j*sc,i*sc,sc,sc)
                            }
                        }
                    }


                },
                69: function() { // e
                    // user actions

                }
            })

            ctx.fillStyle = "black"
            ctx.fillRect(0,0,g.w,g.h)

            ctx.lineWidth = 1

            ctx.save()
            ctx.translate(g.w*0.5, g.h*0.5)

            ctx.beginPath();
            ctx.arc(0,0,size*(gridh-4)/2*0.98,0,Math.PI*2,true);
            ctx.clip();

            var x = g.save.player.x
            var y = g.save.player.y

            // draw floor + bottom part of walls

            for (var i = -gridw/2 ; i <= gridw/2 ; i++) {
                for (var j = -gridh/2 ; j <= gridh/2 + 2; j++) {
                    if (g.save.map[j+y] != undefined) {
                        if (g.save.map[j+y][i+x] > -1){
                            drawFloor(i,x,j,y,false)
                        }
                    }
                }
            }

            // draw player

            g.sprites.player.shadow.next(ctx, -size*0.45, -size*0.25, size*0.9, size*0.75)

            if (left) {
                ctx.save()
                ctx.scale(-1,1)
            }
            playersprite.next(ctx, -size*0.7, -size*1.3, size*1.5, size*1.5)
            if (left) ctx.restore()

            // draw top parts of walls + ceiling (drawing order for depth perception)

            for (var i = -gridw/2 ; i <= gridw/2 ; i++) {
                for (var j = -gridh/2 ; j <= gridh/2 + 2; j++) {
                    if (g.save.map[j+y] != undefined) {
                        if (g.save.map[j+y][i+x] < 0) {
                            drawCeiling(i,x,j,y)
                        } else if (g.save.map[j+y][i+x] > -1){
                            drawFloor(i,x,j,y,true)
                        }
                    }
                }
            }

            // show grid lines (DEBUG) (KEEP, I KNOW YOU'RE GONNA NEED THIS IN THE FUTURE)

            // ctx.strokeStyle = "white"
            //
            // for (var i = -gridw/2 ; i <= gridw/2 ; i++) {
            //     ctx.beginPath()
            //     ctx.moveTo(i*size-g.save.player.xpart,-g.h/2)
            //     ctx.lineTo(i*size-g.save.player.xpart,g.h/2)
            //     ctx.stroke()
            // }
            //
            // for (var j = -gridh/2 ; j <= gridh/2 + 2; j++) {
            //     ctx.beginPath()
            //     ctx.moveTo(-g.w/2,j*size-g.save.player.ypart)
            //     ctx.lineTo(g.w/2,j*size-g.save.player.ypart)
            //     ctx.stroke()
            // }

            g.sprites.player.glow.next(ctx, -size*(gridh-4)/2, -size*(gridh-4)/2, size*(gridh-4), size*(gridh-4))

            for (var i = -vradius ; i <= vradius ; i++) {
                for (var j = -vradius ; j <= vradius ; j++) {
                    if (i*i+j*j < vradius*vradius) {
                        var x = g.save.map[g.save.player.y+j][g.save.player.x+i]
                        if (x < 0 && x > -10) { // impassable, first time seeing
                            g.save.map[g.save.player.y+j][g.save.player.x+i] -= 10
                        } else if (x > 0 && x % 100 < 10) { // passable, first time seeing
                            g.save.map[g.save.player.y+j][g.save.player.x+i] += 10
                        }
                    }
                }
            }

            ctx.restore()

            // draw HUD

            // health and stamina bars
            g.sprites.hud.topleft.next(ctx, size*0.25, size*0.25, size*4.5, size*1.5)

            var hStartx = snapTo(35/192*size*4.5+size*0.25,c)
            var sStartx = snapTo(53/192*size*4.5+size*0.25,c)-1
            var hStarty = snapTo(13/64*size*1.5+size*0.25,c)-1
            var sStarty = snapTo(43/64*size*1.5+size*0.25,c)

            var hlength = snapTo(144/192*g.save.player.health*size*4.5,c)
            var slength = snapTo(112/192*g.save.player.stamina*size*4.5,c)

            g.sprites.hud.hfill.next(ctx,hStartx,hStarty,hlength,size*1.5/8)
            g.sprites.hud.sfill.next(ctx,sStartx,sStarty,slength,size*1.5/8)


            // inventory
            ctx.fillStyle = "white"
            // ctx.fillText("rope: "+(g.save.player.inv.rope/100).toFixed(2)+" m", 0, g.h/3)
            // ctx.fillText("scraps: "+g.save.player.inv.scraps, 0, g.h/3*2)

            g.sprites.hud.rope.next(ctx,0,g.h-size, size, size)
            g.sprites.hud.scrap.next(ctx,0,g.h-size*2, size, size)



            ctx.font = Math.floor(size*0.5) + "px arcade"
            ctx.fillText((g.save.player.inv.rope/100).toFixed(2)+" m", size*1.1, g.h-size*0.2)
            ctx.fillText(g.save.player.inv.scraps, size*1.1, g.h-size*0.1-size)


            if (g.save.player.map.vel) {
                g.save.player.map.pos += g.save.player.map.vel
                if (g.save.player.map.pos <= 0 || g.save.player.map.pos >= g.h) g.save.player.map.vel = 0
            }

            // draw map
            if (g.save.player.map.pos < g.h) {

                var xc = g.w*0.70/g.save.map[0].length
                var yc = g.h*0.85/g.save.map.length

                var mw = g.w*0.7
                var mh = g.h*0.85

                var sc

                if (xc < yc) {
                    sc = xc
                    mh *= sc/yc
                } else {
                    sc = yc
                    mw *= sc/xc
                }

                ctx.save()
                ctx.translate(0,g.save.player.map.pos)

                ctx.clearRect(g.w*0.15+g.w*0.35-mw/2, g.h*0.15-mh/2+g.h*0.425,mw,mh)

                g.sprites.hud.scroll.next(ctx,g.w*0.1,g.h*0.1,g.w*0.8,g.h)

                ctx.lineWidth = 6
                ctx.strokeRect(g.w*0.15, g.h*0.15, g.w*0.7, g.h*0.85)

                ctx.drawImage(g.save.player.map.ctx.canvas, g.w*0.15+g.w*0.35-mw/2, g.h*0.15-mh/2+g.h*0.425)

                g.sprites.hud.mask.next(ctx,g.w*0.1,g.h*0.1,g.w*0.8,g.h)

                g.sprites.player.icon.next(ctx,g.w*0.15+g.w*0.35-mw/2+g.save.player.x*sc+sc/2-sc*5/2,g.h*0.15-mh/2+g.h*0.425+g.save.player.y*sc+sc/2-sc*5/2-g.save.player.map.bounce.next().value*sc,sc*5,sc*5)

                ctx.restore()
            }

            if (g.first) {

                // for (var i = -gridw/2 ; i <= gridw/2 ; i++) {
                //     for (var j = -gridh/2 ; j <= gridh/2 + 2; j++) {
                //         console.log(j, i, g.save.map[j+g.save.player.y][i+g.save.player.x]);
                //     }
                // }

                g.first = false
            }

            yield
        }
    })(game)

    game.states["debug"] = (function*(g) {
        while(true) {
            processInputs(g.inq, {
                81: function() {
                    game.state = "play"
                }
            })
            drawMap(g)
            yield
        }
    })(game)

    // key listeners
    window.addEventListener("keydown", function(e) {
        game.inq.push(e.keyCode)
    })
    window.addEventListener("keyup", function(e) {
        game.inq.push(e.keyCode * -1)
    })

    return game
}

window.onload = function() {
    (function(g) {
        function t() { // tick (game loop)
            window.requestAnimationFrame(t)
            g.states[g.state].next() // update game
        }
        t()
    })(init()) // initialize
}
