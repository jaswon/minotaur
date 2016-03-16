// http://stackoverflow.com/questions/5837572/generate-a-random-point-within-a-circle-uniformly
function randInCircle () {
    var t = 2 * Math.PI * Math.random()
    var u = Math.random() + Math.random()
    var r = (u>1)?(2-u):u
    return [r*Math.cos(t),r*Math.sin(t)]
}

function snapTo(v,s) {
    return Math.round(v/s)*s
}

function snap(v,s) {
    v = Math.floor(v/s)*s
}

function center(rect) {
    return [rect.x+rect.w/2, rect.y+rect.h/2]
}

// http://gamedev.stackexchange.com/questions/29786/a-simple-2d-rectangle-collision-algorithm-that-also-determines-which-sides-that
function detectCollision(rect1,rect2) {
    var w = 0.5 * (rect1.w + rect2.w);
    var h = 0.5 * (rect1.h + rect2.h);
    var dx = center(rect1)[0] - center(rect2)[0];
    var dy = center(rect1)[1] - center(rect2)[1];

    if (Math.abs(dx) < w && Math.abs(dy) < h)
    {
        /* collision! */
        var wy = w * dy;
        var hx = h * dx;

        if (wy > hx)
            if (wy > -hx)
                /* collision at the bottom */ return 2
            else
                /* on the left */ return 3
        else
            if (wy > -hx)
                /* on the right */ return 4
            else
                /* at the top */ return 1
    }
    return 0
}

function nRand(s) {
    var it = s
    var val = 0
    while (it--) val += Math.random()
    val = val / s
    return val
}

function distSq(p,q) {
    return p[0]*p[0]+q[0]*q[0]
}

function drawMap(g) {
    var n = g.save.map[0].length
    var cs = 3
    var d = 0
    g.ctx.save()
    g.ctx.translate(g.w/2-n*(cs+d)/2,g.h/2-g.save.map.length*(cs+d)/2)
    for (var i = 0 ; i < g.save.map.length ; i++) {
        for (var j = 0 ; j < n ; j++) {
            // if (g.save.map[i][j] >= 10) {
            //     g.ctx.fillStyle = "red"
            // } else {
            //     g.ctx.fillStyle = "black"
            // }
            if (g.save.map[i][j] < 0) {
                g.ctx.fillStyle = "black"
            } else {
                g.ctx.fillStyle = "red"
            }
            g.ctx.fillRect(j*(cs+d),i*(cs+d),cs,cs)
        }
    }
    g.ctx.fillStyle = "green"
    g.ctx.fillRect(g.save.player.x*(cs+d),g.save.player.y*(cs+d),cs,cs)

    g.ctx.restore()
}
