function Graph() {
    this.nodes = []
    this.edges = []
    this.setNode = function(id, label) {
        this.nodes.push(new Node(id, label, this))
    }
    this.getNode = function(id) {
        return this.nodes.find(function(e) {
            return e.id == id
        })
    }
    this.connect = function(id1, id2) {
        var n1 = this.getNode(id1)
        var n2 = this.getNode(id2)
        if (n1 && n2) n1.edge(n2)
    }
    this.disconnect = function(id1,id2) {
        var n1 = this.getNode(id1)
        var n2 = this.getNode(id2)
        if (n1 && n2) n1.removeEdge(n2)
    }
}

function Node(id, label, g) {
    this.parent = g
    this.id = id
    this.label = label
    this.neighbors = []
    this.edge = function(head) {
        if (this.neighbors.indexOf(head) < 0) {
            this.neighbors.push(head)
            head.neighbors.push(this)
            this.parent.edges.push([this,head])
        }
    }
    this.removeEdge = function(head) {
        if ((i = this.neighbors.indexOf(head)) > -1) {
            this.neighbors.splice(i,1)
            head.neighbors.splice(head.neighbors.indexOf(this),1)
            this.parent.edges.splice(this.parent.edges.indexOf([this,head]),1)
        }
    }
}

function union(a,b) {
    a.forEach(function(value) {
        b.add(value)
    });
    return b
}

function isCyclic(g) {
    var sets = []
    for (var i = 0 ; i < g.nodes.length ; i++ ) {
        sets.push(new Set([g.nodes[i].id]))
    }
    // console.log(sets);
    for (var i = 0 ; i < g.edges.length ; i++ ) {
        var edge = g.edges[i]
        var match = []
        var count = 2
        var indices = []
        for (var j = 0 ; j < sets.length ; j++) {
            if (!count) break
            var set = sets[j]
            if (set.has(edge[0].id)) {
                count--
                match.push(set)
                indices.push(j)
            }
            if (set.has(edge[1].id)) {
                count--
                match.push(set)
                indices.push(j)
            }
        }
        // console.log(sets,edge[0].id, edge[1].id, match, indices)
        if (indices[0] == indices[1]) return true
        union(match[0],match[1])
        sets.splice(indices[0],1)
        // debugger;
    }
    return false
}

function kruskalMST(g,fn) {
    var ret = new Graph()
    for (var i = 0 ; i < g.nodes.length ; i++) {
        var n = g.nodes[i]
        ret.setNode(n.id, n.label)
    }
    var V = ret.nodes.length
    g.edges.sort(function(a,b) {
        return fn(a)-fn(b)
    })
    // var i = 0
    // while (ret.edges.length < V - 1) {
    for (var i = 0 ; i < g.edges.length; i++) {
        var e = g.edges[i]
        ret.connect(e[0].id,e[1].id)
        // console.log(ret);
        if (isCyclic(ret)) {
            // console.log("fuck");
            ret.disconnect(e[0].id,e[1].id)
        }
        // i++
    }
    return ret
}
