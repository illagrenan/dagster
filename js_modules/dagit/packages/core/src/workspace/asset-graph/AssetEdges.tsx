import React from 'react';
import styled from 'styled-components/macro';

import {ColorsWIP} from '../../ui/Colors';

import {buildSVGPath, IEdge} from './Utils';

export const AssetEdges: React.FC<{edges: IEdge[]}> = ({edges}) => (
  <>
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
      {edges.map((edge, idx) => (
        <StyledPath
          key={idx}
          d={buildSVGPath({source: edge.from, target: edge.to})}
          dashed={edge.dashed}
          markerEnd="url(#arrow)"
        />
      ))}
    </g>
  </>
);

const StyledPath = styled('path')<{dashed: boolean}>`
  stroke-width: 4;
  stroke: ${ColorsWIP.Gray600};
  ${({dashed}) => (dashed ? `stroke-dasharray: 8 2;` : '')}
  fill: none;
`;
