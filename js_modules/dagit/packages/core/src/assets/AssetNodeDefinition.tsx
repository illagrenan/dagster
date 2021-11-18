import {gql} from '@apollo/client';
import * as React from 'react';

import {Description} from '../pipelines/Description';
import {Box} from '../ui/Box';
import {ColorsWIP} from '../ui/Colors';
import {Subheading} from '../ui/Text';
import {ASSET_NODE_FRAGMENT} from '../workspace/asset-graph/AssetNode';

import {AssetNeighborsGraph} from './AssetNeighborsGraph';
import {AssetNodeDefinitionFragment} from './types/AssetNodeDefinitionFragment';

export const AssetNodeDefinition: React.FC<{assetNode: AssetNodeDefinitionFragment}> = ({
  assetNode,
}) => {
  return (
    <Box
      flex={{direction: 'row'}}
      border={{side: 'bottom', width: 1, color: ColorsWIP.KeylineGray}}
    >
      <Box style={{flex: 1}}>
        <Box
          padding={{vertical: 16, horizontal: 24}}
          border={{side: 'bottom', width: 1, color: ColorsWIP.KeylineGray}}
        >
          <Subheading>Description</Subheading>
        </Box>
        <Box padding={{vertical: 16, horizontal: 24}}>
          <Description description={assetNode.description || 'No description provided.'} />
        </Box>
      </Box>
      <Box
        border={{side: 'left', width: 1, color: ColorsWIP.KeylineGray}}
        style={{width: '50%', height: 500}}
      >
        <Box
          padding={{vertical: 16, horizontal: 24}}
          border={{side: 'bottom', width: 1, color: ColorsWIP.KeylineGray}}
        >
          <Subheading>Related Assets</Subheading>
        </Box>
        <Box margin={{horizontal: 24}} style={{position: 'relative'}}>
          <AssetNeighborsGraph assetNode={assetNode} />
        </Box>
      </Box>
    </Box>
  );
};

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
