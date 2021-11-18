import {gql} from '@apollo/client';
import * as React from 'react';
import styled from 'styled-components/macro';

import {SVGViewport} from '../graph/SVGViewport';
import {Description} from '../pipelines/Description';
import {Box} from '../ui/Box';
import {AssetEdges} from '../workspace/asset-graph/AssetEdges';
import {
  AssetNode,
  ASSET_NODE_FRAGMENT,
  getNodeDimensions,
} from '../workspace/asset-graph/AssetNode';
import {getForeignNodeDimensions, ForeignNode} from '../workspace/asset-graph/ForeignNode';
import {layoutGraph, buildGraphComputeStatuses} from '../workspace/asset-graph/Utils';

import {AssetNodeDefinitionFragment} from './types/AssetNodeDefinitionFragment';

export const AssetNodeDefinition: React.FC<{assetNode: AssetNodeDefinitionFragment}> = ({
  assetNode,
}) => {
  const layout = layoutGraph(graphData);
  const computeStatuses = buildGraphComputeStatuses(graphData);

  return (
    <Box flex={{gap: 20}}>
      <div style={{paddingTop: 16, paddingLeft: 24}}>
        <Description description={assetNode.description} />
      </div>
      <div>
        <SVGViewport
          interactor={SVGViewport.Interactors.PanAndZoom}
          graphWidth={layout.width}
          graphHeight={layout.height}
          onKeyDown={() => {}}
          onClick={() => {}}
          maxZoom={1.2}
          maxAutocenterZoom={1.0}
        >
          {({scale: _scale}: any) => (
            <SVGContainer width={layout.width} height={layout.height}>
              <AssetEdges edges={layout.edges} />
              {layout.nodes.map((layoutNode) => {
                const graphNode = graphData.nodes[layoutNode.id];
                const {width, height} = graphNode.hidden
                  ? getForeignNodeDimensions(layoutNode.id)
                  : getNodeDimensions(graphNode.definition);
                return (
                  <foreignObject
                    key={layoutNode.id}
                    x={layoutNode.x}
                    y={layoutNode.y}
                    width={width}
                    height={height}
                    onClick={(e) => onSelectNode(e, graphNode)}
                    style={{overflow: 'visible'}}
                  >
                    {graphNode.hidden ? (
                      <ForeignNode assetKey={graphNode.assetKey} />
                    ) : (
                      <AssetNode
                        definition={graphNode.definition}
                        handle={handles.find((h) => h.handleID === graphNode.definition.opName)!}
                        selected={selectedGraphNode === graphNode}
                        computeStatus={computeStatuses[graphNode.id]}
                        repoAddress={repoAddress}
                        secondaryHighlight={
                          explorerPath.opsQuery
                            ? highlighted.some(
                                (h) => h.definition.name === graphNode.definition.opName,
                              )
                            : false
                        }
                      />
                    )}
                  </foreignObject>
                );
              })}
            </SVGContainer>
          )}
        </SVGViewport>
      </div>
    </Box>
  );
};

const SVGContainer = styled.svg`
  overflow: visible;
  border-radius: 0;
`;

export const ASSET_NODE_DEFINITION_FRAGMENT = gql`
  fragment AssetNodeDefinitionFragment on AssetNode {
    id
    ...AssetNodeFragment

    dependencies {
      asset {
        id
        ...AssetNodeFragment
      }
    }
    dependedBy {
      asset {
        id
        ...AssetNodeFragment
      }
    }
  }
  ${ASSET_NODE_FRAGMENT}
`;
