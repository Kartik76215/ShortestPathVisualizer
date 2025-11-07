#include <emscripten/bind.h>
#include <queue>
#include <vector>
#include <string>
#include <cmath>
#include <sstream>
#include <algorithm>

using namespace std;
using namespace emscripten;

struct Node {
    int r, c;
    double f, g, h;
    bool operator>(const Node& other) const { return f > other.f; }
};

string findPath(int sr, int sc, int er, int ec) {
    const int ROWS = 10, COLS = 10; // fixed grid for now
    vector<vector<int>> grid(ROWS, vector<int>(COLS, 0));

    auto heuristic = [&](int r, int c) {
        return static_cast<double>(abs(er - r) + abs(ec - c));
    };

    priority_queue<Node, vector<Node>, greater<Node>> open;
    vector<vector<double>> gScore(ROWS, vector<double>(COLS, 1e9));
    vector<vector<pair<int, int>>> parent(ROWS, vector<pair<int, int>>(COLS, {-1, -1}));

    gScore[sr][sc] = 0;
    open.push({sr, sc, heuristic(sr, sc), 0.0, heuristic(sr, sc)});

    int dr[4] = {-1, 1, 0, 0};
    int dc[4] = {0, 0, -1, 1};

    while (!open.empty()) {
        Node cur = open.top();
        open.pop();

        if (cur.r == er && cur.c == ec) break;

        for (int i = 0; i < 4; ++i) {
            int nr = cur.r + dr[i];
            int nc = cur.c + dc[i];
            if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS) continue;

            double ng = gScore[cur.r][cur.c] + 1.0;
            if (ng < gScore[nr][nc]) {
                gScore[nr][nc] = ng;
                parent[nr][nc] = {cur.r, cur.c};
                open.push({nr, nc, ng + heuristic(nr, nc), ng, heuristic(nr, nc)});
            }
        }
    }

    vector<pair<int, int>> path;
    int r = er, c = ec;
    while (r != -1 && c != -1) {
        path.push_back({r, c});
        auto p = parent[r][c];
        r = p.first;
        c = p.second;
    }

    reverse(path.begin(), path.end());

    // Return valid JSON format like [[0,0],[1,0],[2,0]]
    ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < path.size(); ++i) {
        oss << "[" << path[i].first << "," << path[i].second << "]";
        if (i + 1 < path.size()) oss << ",";
    }
    oss << "]";
    return oss.str();
}

// Bind C++ to JS
EMSCRIPTEN_BINDINGS(pathfinder_module) {
    emscripten::function("findPath", &findPath);
}
