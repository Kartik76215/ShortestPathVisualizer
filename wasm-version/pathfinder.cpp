#include <emscripten/bind.h>
#include <vector>
#include <queue>
#include <string>
#include <cmath>
#include <sstream>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
using namespace std;
using namespace emscripten;

struct Node {
    int r, c;
    double f, g;
    Node(int r, int c, double f = 0, double g = 0) : r(r), c(c), f(f), g(g) {}
};

inline int encode(int r, int c, int cols) { return r * cols + c; }
inline pair<int, int> decode(int key, int cols) { return {key / cols, key % cols}; }

vector<pair<int, int>> getNeighbors(int r, int c, int rows, int cols) {
    vector<pair<int, int>> nbrs;
    if (r > 0) nbrs.push_back({r - 1, c});
    if (c > 0) nbrs.push_back({r, c - 1});
    if (r < rows - 1) nbrs.push_back({r + 1, c});
    if (c < cols - 1) nbrs.push_back({r, c + 1});
    return nbrs;
}

double heuristic(int r1, int c1, int r2, int c2) {
    return abs(r1 - r2) + abs(c1 - c2); // Manhattan
}

string toJSON(vector<pair<int, int>> visited, vector<pair<int, int>> path) {
    ostringstream oss;
    oss << "{\"visited\":[";
    for (size_t i = 0; i < visited.size(); i++) {
        oss << "[" << visited[i].first << "," << visited[i].second << "]";
        if (i + 1 < visited.size()) oss << ",";
    }
    oss << "],\"path\":[";
    for (size_t i = 0; i < path.size(); i++) {
        oss << "[" << path[i].first << "," << path[i].second << "]";
        if (i + 1 < path.size()) oss << ",";
    }
    oss << "]}";
    return oss.str();
}

string findPath(
    string algo, int sr, int sc, int er, int ec,
    string walls, int rows, int cols
) {
    vector<vector<int>> grid(rows, vector<int>(cols, 0));
    for (int i = 0; i < (int)walls.size() && i < rows * cols; i++) {
        grid[i / cols][i % cols] = (walls[i] == '1');
    }

    vector<pair<int, int>> visited;
    unordered_map<int, int> parent;

    auto inBounds = [&](int r, int c) {
        return r >= 0 && c >= 0 && r < rows && c < cols && grid[r][c] == 0;
    };

    // BFS
    if (algo == "bfs") {
        queue<pair<int, int>> q;
        unordered_set<int> seen;
        int startKey = encode(sr, sc, cols);
        q.push({sr, sc});
        seen.insert(startKey);

        while (!q.empty()) {
            auto [r, c] = q.front(); q.pop();
            visited.push_back({r, c});
            if (r == er && c == ec) break;

            for (auto [nr, nc] : getNeighbors(r, c, rows, cols)) {
                int nk = encode(nr, nc, cols);
                if (!inBounds(nr, nc) || seen.count(nk)) continue;
                seen.insert(nk);
                parent[nk] = encode(r, c, cols);
                q.push({nr, nc});
            }
        }
    }

    // Dijkstra
    else if (algo == "dijkstra") {
        struct Item { int key; double dist; bool operator>(const Item& o) const { return dist > o.dist; } };
        priority_queue<Item, vector<Item>, greater<Item>> pq;
        unordered_map<int, double> dist;
        int startKey = encode(sr, sc, cols);
        dist[startKey] = 0;
        pq.push({startKey, 0});

        while (!pq.empty()) {
            auto [key, d] = pq.top(); pq.pop();
            auto [r, c] = decode(key, cols);
            if (dist[key] < d) continue;
            visited.push_back({r, c});
            if (r == er && c == ec) break;

            for (auto [nr, nc] : getNeighbors(r, c, rows, cols)) {
                if (!inBounds(nr, nc)) continue;
                int nk = encode(nr, nc, cols);
                double nd = d + 1;
                if (!dist.count(nk) || nd < dist[nk]) {
                    dist[nk] = nd;
                    parent[nk] = key;
                    pq.push({nk, nd});
                }
            }
        }
    }

    // A*
    else {
        struct Item { int key; double f, g; bool operator>(const Item& o) const { return f > o.f; } };
        priority_queue<Item, vector<Item>, greater<Item>> open;
        unordered_map<int, double> g;
        int startKey = encode(sr, sc, cols);
        int endKey = encode(er, ec, cols);
        g[startKey] = 0;
        open.push({startKey, heuristic(sr, sc, er, ec), 0});

        while (!open.empty()) {
            auto [key, f, gScore] = open.top(); open.pop();
            auto [r, c] = decode(key, cols);
            visited.push_back({r, c});
            if (key == endKey) break;

            for (auto [nr, nc] : getNeighbors(r, c, rows, cols)) {
                if (!inBounds(nr, nc)) continue;
                int nk = encode(nr, nc, cols);
                double ng = g[key] + 1;
                if (!g.count(nk) || ng < g[nk]) {
                    g[nk] = ng;
                    parent[nk] = key;
                    double fScore = ng + heuristic(nr, nc, er, ec);
                    open.push({nk, fScore, ng});
                }
            }
        }
    }

    // reconstruct path
    vector<pair<int, int>> path;
    int key = encode(er, ec, cols);
    unordered_set<int> visitedSet;
    while (parent.count(key) && !visitedSet.count(key)) {
        visitedSet.insert(key);
        auto [r, c] = decode(key, cols);
        path.push_back({r, c});
        key = parent[key];
    }
    reverse(path.begin(), path.end());
    return toJSON(visited, path);
}

EMSCRIPTEN_BINDINGS(pathfinder_module) {
    emscripten::function("findPath", &findPath);
}
