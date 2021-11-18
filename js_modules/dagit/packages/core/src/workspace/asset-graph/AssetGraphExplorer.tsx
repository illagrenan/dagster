import {gql, useQuery} from '@apollo/client';
import {uniq, without} from 'lodash';
import React from 'react';
import styled from 'styled-components/macro';

import {filterByQuery} from '../../app/GraphQueryImpl';
import {LATEST_MATERIALIZATION_METADATA_FRAGMENT} from '../../assets/LastMaterializationMetadata';
import {LaunchRootExecutionButton} from '../../execute/LaunchRootExecutionButton';
import {SVGViewport} from '../../graph/SVGViewport';
import {useDocumentTitle} from '../../hooks/useDocumentTitle';
import {ExplorerPath} from '../../pipelines/PipelinePathUtils';
import {SidebarPipelineOrJobOverview} from '../../pipelines/SidebarPipelineOrJobOverview';
import {GraphExplorerSolidHandleFragment} from '../../pipelines/types/GraphExplorerSolidHandleFragment';
import {METADATA_ENTRY_FRAGMENT} from '../../runs/MetadataEntry';
import {ColorsWIP} from '../../ui/Colors';
import {GraphQueryInput} from '../../ui/GraphQueryInput';
import {Loading} from '../../ui/Loading';
import {NonIdealState} from '../../ui/NonIdealState';
import {SplitPanelContainer} from '../../ui/SplitPanelContainer';
import {repoAddressToSelector} from '../repoAddressToSelector';
import {RepoAddress} from '../types';

import {AssetNode, getNodeDimensions} from './AssetNode';
import {ForeignNode, getForeignNodeDimensions} from './ForeignNode';
import {SidebarAssetInfo} from './SidebarAssetInfo';
import {
  buildGraphComputeStatuses,
  buildGraphData,
  buildSVGPath,
  GraphData,
  graphHasCycles,
  layoutGraph,
  Node,
} from './Utils';
import {
  AssetGraphQuery,
  AssetGraphQueryVariables,
  AssetGraphQuery_repositoryOrError_Repository_assetNodes,
} from './types/AssetGraphQuery';

type AssetNode = AssetGraphQuery_repositoryOrError_Repository_assetNodes;

interface Props {
  repoAddress: RepoAddress;
  explorerPath: ExplorerPath;
  handles: GraphExplorerSolidHandleFragment[];
  selectedHandle?: GraphExplorerSolidHandleFragment;
  onChangeExplorerPath: (path: ExplorerPath, mode: 'replace' | 'push') => void;
}

export const AssetGraphExplorer: React.FC<Props> = (props) => {
  const repositorySelector = repoAddressToSelector(props.repoAddress);
  const queryResult = useQuery<AssetGraphQuery, AssetGraphQueryVariables>(ASSETS_GRAPH_QUERY, {
    variables: {repositorySelector},
    notifyOnNetworkStatusChange: true,
  });

  useDocumentTitle('Assets');

  return (
    <Loading allowStaleData queryResult={queryResult}>
      {({repositoryOrError}) => {
        if (repositoryOrError.__typename !== 'Repository') {
          return <NonIdealState icon="error" title="Query Error" />;
        }

        const graphData = buildGraphData(repositoryOrError, props.explorerPath.pipelineName);

        if (graphHasCycles(graphData)) {
          return (
            <NonIdealState
              icon="error"
              title="Cycle detected"
              description="Assets dependencies form a cycle"
            />
          );
        }
        if (!Object.keys(graphData.nodes).length) {
          return (
            <NonIdealState
              icon="no-results"
              title="No assets defined"
              description="No assets defined using the @asset definition"
            />
          );
        }

        return <AssetGraphExplorerWithData graphData={graphData} {...props} />;
      }}
    </Loading>
  );
};

const AssetGraphExplorerWithData: React.FC<
  {graphData: ReturnType<typeof buildGraphData>} & Props
> = (props) => {
  const {
    repoAddress,
    handles,
    selectedHandle,
    explorerPath,
    onChangeExplorerPath,
    graphData,
  } = props;

  const selectedDefinition = selectedHandle?.solid.definition;
  const selectedGraphNode =
    selectedDefinition &&
    Object.values(graphData.nodes).find(
      (node) => node.definition.opName === selectedDefinition.name,
    );

  const onSelectNode = React.useCallback(
    (e: React.MouseEvent<any>, node: Node) => {
      e.stopPropagation();

      const {opName, jobName} = node.definition;
      if (!opName) {
        return;
      }

      const append = jobName === explorerPath.pipelineName && (e.shiftKey || e.metaKey);
      const existing = explorerPath.opsQuery.split(',');
      const added =
        e.shiftKey && selectedGraphNode
          ? opsInRange({graph: graphData, from: selectedGraphNode, to: node})
          : [opName];

      const next = append
        ? (existing.includes(opName)
            ? without(existing, opName)
            : uniq([...existing, ...added])
          ).join(',')
        : `${opName}`;

      onChangeExplorerPath(
        {
          ...explorerPath,
          opNames: [opName],
          opsQuery: next,
          pipelineName: jobName || explorerPath.pipelineName,
        },
        'replace',
      );
    },
    [onChangeExplorerPath, explorerPath],
  );

  const {all: highlighted} = React.useMemo(
    () =>
      filterByQuery(
        handles.map((h) => h.solid),
        explorerPath.opsQuery,
      ),
    [explorerPath.opsQuery, handles],
  );

  const layout = layoutGraph(graphData);
  const computeStatuses = buildGraphComputeStatuses(graphData);

  return (
    <SplitPanelContainer
      identifier="explorer"
      firstInitialPercent={70}
      firstMinSize={600}
      first={
        <>
          <SVGViewport
            interactor={SVGViewport.Interactors.PanAndZoom}
            graphWidth={layout.width}
            graphHeight={layout.height}
            onKeyDown={() => {}}
            onClick={() =>
              onChangeExplorerPath(
                {
                  ...explorerPath,
                  pipelineName: explorerPath.pipelineName,
                  opsQuery: '',
                  opNames: [],
                },
                'replace',
              )
            }
            maxZoom={1.2}
            maxAutocenterZoom={1.0}
          >
            {({scale: _scale}: any) => (
              <SVGContainer width={layout.width} height={layout.height}>
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 8 10"
                    refX="1"
                    refY="5"
                    markerUnits="strokeWidth"
                    markerWidth="4"
                    orient="auto"
                  >
                    <path d="M 0 0 L 8 5 L 0 10 z" fill={ColorsWIP.Gray600} />
                  </marker>
                </defs>
                <g opacity={0.2}>
                  {layout.edges.map((edge, idx) => (
                    <StyledPath
                      key={idx}
                      d={buildSVGPath({source: edge.from, target: edge.to})}
                      dashed={edge.dashed}
                      markerEnd="url(#arrow)"
                    />
                  ))}
                </g>
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

          <AssetQueryInputContainer>
            <GraphQueryInput
              items={handles.map((h) => h.solid)}
              value={explorerPath.opsQuery}
              placeholder="Type an asset subset…"
              onChange={(opsQuery) => onChangeExplorerPath({...explorerPath, opsQuery}, 'replace')}
            />
            <LaunchRootExecutionButton
              pipelineName={explorerPath.pipelineName}
              getVariables={() => ({
                executionParams: {
                  mode: 'default',
                  executionMetadata: {},
                  runConfigData: {},
                  selector: {
                    ...repoAddressToSelector(repoAddress),
                    pipelineName: explorerPath.pipelineName,
                    solidSelection: highlighted.map((h) => h.name),
                  },
                },
              })}
              disabled={!explorerPath.opsQuery || highlighted.length === 0}
            />
          </AssetQueryInputContainer>
        </>
      }
      second={
        selectedGraphNode && selectedDefinition ? (
          <SidebarAssetInfo
            node={selectedGraphNode.definition}
            definition={selectedDefinition}
            repoAddress={repoAddress}
          />
        ) : (
          <SidebarPipelineOrJobOverview repoAddress={repoAddress} explorerPath={explorerPath} />
        )
      }
    />
  );
};

const ASSETS_GRAPH_QUERY = gql`
  query AssetGraphQuery($repositorySelector: RepositorySelector!) {
    repositoryOrError(repositorySelector: $repositorySelector) {
      ... on Repository {
        id
        name
        location {
          id
          name
        }
        assetNodes {
          id
          assetKey {
            path
          }
          opName
          description
          jobName
          dependencies {
            inputName
            upstreamAsset {
              id
              assetKey {
                path
              }
            }
          }
          assetMaterializations(limit: 1) {
            ...LatestMaterializationMetadataFragment

            materializationEvent {
              materialization {
                metadataEntries {
                  ...MetadataEntryFragment
                }
              }
              stepStats {
                stepKey
                startTime
                endTime
              }
            }
            runOrError {
              ... on PipelineRun {
                id
                runId
                status
                pipelineName
                mode
              }
            }
          }
        }
        pipelines {
          id
          name
          modes {
            id
            name
          }
        }
      }
    }
  }
  ${METADATA_ENTRY_FRAGMENT}
  ${LATEST_MATERIALIZATION_METADATA_FRAGMENT}
`;

const SVGContainer = styled.svg`
  overflow: visible;
  border-radius: 0;
`;
const StyledPath = styled('path')<{dashed: boolean}>`
  stroke-width: 4;
  stroke: ${ColorsWIP.Gray600};
  ${({dashed}) => (dashed ? `stroke-dasharray: 8 2;` : '')}
  fill: none;
`;

const AssetQueryInputContainer = styled.div`
  z-index: 2;
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  display: flex;
`;

const opsInRange = (
  {graph, from, to}: {graph: GraphData; from: Node; to: Node},
  seen: string[] = [],
) => {
  if (!from) {
    return [];
  }
  if (from.id === to.id) {
    return [to.definition.opName!];
  }
  const adjacent = [
    ...Object.keys(graph.upstream[from.id] || {}),
    ...Object.keys(graph.downstream[from.id] || {}),
  ].map((n) => graph.nodes[n]);

  let best: string[] = [];

  for (const node of adjacent) {
    if (seen.includes(node.id)) {
      continue;
    }
    const result: string[] = opsInRange({graph, from: node, to}, [...seen, from.id]);
    if (result.length && (best.length === 0 || result.length < best.length)) {
      best = [from.definition.opName!, ...result];
    }
  }
  return best;
};
