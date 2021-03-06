import { ShortestPaths } from 'algorithms/steiner-tree/shortest-paths';
import { Dijkstra, InverseDijkstra } from 'algorithms/shortest-paths/dijkstra';

import Graph from 'models/graph/graph';

import { Vertex } from 'types/vertex';
import { IPath, IPathListMap, IPathMap } from 'types/paths';

export class Roos {
    private readonly graph: Graph;
    private readonly root: Vertex;
    private readonly terminals: Vertex[];

    private readonly shortestPathsFromRoot: IPathMap;
    private readonly sortedPathsToTerminals: IPathListMap = {};

    constructor(graph: Graph, root: Vertex, terminals: Vertex[]) {
        this.graph = graph;
        this.root = root;
        this.terminals = terminals;

        this.shortestPathsFromRoot = new Dijkstra(this.graph, root).calculate();

        this.initSortedPathsToTerminals();
    }

    private initSortedPathsToTerminals() {
        this.graph.vertices.forEach(vertex => {
            this.sortedPathsToTerminals[vertex] = [];
        });

        this.terminals.forEach(terminal => {
            const shortestPaths = new InverseDijkstra(this.graph, terminal).calculate();

            this.graph.vertices.forEach(vertex => {
                this.sortedPathsToTerminals[vertex].push({ path: shortestPaths[vertex], dst: terminal });
            });
        });

        this.graph.vertices.forEach(vertex => {
            this.sortedPathsToTerminals[vertex].sort((a, b) => (a.path.cost >= b.path.cost ? 1 : -1));
        });
    }

    public calculate() {
        const steinerTree = new Graph();
        let terminals = this.terminals;

        while (terminals.length > 0) {
            const { bestPaths, bestTreeTerminals } = this.findTreeWithBestDensity(terminals);

            if (bestPaths.length === 0) {
                break;
            }

            bestPaths.forEach(path => {
                path.cost = 0;
                steinerTree.addEdges(path.edges);
            });

            terminals = terminals.filter(terminal => !bestTreeTerminals.includes(terminal));
        }

        return new ShortestPaths(steinerTree, this.root, this.terminals).calculate();
    }

    private findTreeWithBestDensity(terminals: Vertex[]) {
        let bestPaths: IPath[] = null;
        let bestDensity = Infinity;
        let bestTreeTerminals = [];

        this.graph.vertices.forEach(vertex => {
            const firstPath = this.shortestPathsFromRoot[vertex];

            if (firstPath.cost === Infinity) {
                return;
            }

            const paths = [firstPath];
            let currentDensity = Infinity;
            let currentCost = firstPath.cost;
            let currentTerminals = [];

            for (const secondPath of this.sortedPathsToTerminals[vertex]) {
                if (!terminals.includes(secondPath.dst)) {
                    continue;
                }

                currentCost += secondPath.path.cost;

                const possibleDensity = currentCost / (currentTerminals.length + 1);

                if (possibleDensity >= currentDensity) {
                    break;
                }

                paths.push(secondPath.path);
                currentTerminals.push(secondPath.dst);
                currentDensity = possibleDensity;
            }

            if (currentDensity < bestDensity) {
                bestPaths = paths;
                bestDensity = currentDensity;
                bestTreeTerminals = currentTerminals;
            }
        });

        return { bestPaths, bestDensity, bestTreeTerminals };
    }
}
