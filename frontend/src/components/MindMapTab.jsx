import React, { useMemo } from 'react';

export default function MindMapTab({ mindMap, onNodeClick }) {
  const width = 500;
  const height = 350;
  const center = { x: width / 2, y: height / 2 };

  // Calculate coordinates for nodes using a radial layout
  const positionedNodes = useMemo(() => {
    if (!mindMap || !mindMap.nodes || mindMap.nodes.length === 0) return [];

    const nodes = [...mindMap.nodes];
    
    // Identify the central/root node (often the first node, or the one with the highest size/val)
    let rootIndex = 0;
    let maxVal = -1;
    nodes.forEach((node, idx) => {
      if (node.val > maxVal) {
        maxVal = node.val;
        rootIndex = idx;
      }
    });

    const rootNode = nodes[rootIndex];
    const otherNodes = nodes.filter((_, idx) => idx !== rootIndex);
    const count = otherNodes.length;

    const result = {};
    
    // Position root node in the exact center
    result[rootNode.id] = {
      ...rootNode,
      x: center.x,
      y: center.y,
      isRoot: true,
      color: '#8b5cf6' // Purple for root
    };

    // Distribute other nodes in circles
    otherNodes.forEach((node, index) => {
      // Determine radius and angle
      // If we have many nodes, we can alternate between two radius depths for better spacing
      const depth = index % 2 === 0 ? 110 : 160;
      const angle = (index * 2 * Math.PI) / count;
      
      result[node.id] = {
        ...node,
        x: center.x + Math.cos(angle) * depth,
        y: center.y + Math.sin(angle) * depth,
        isRoot: false,
        color: depth === 110 ? '#3b82f6' : '#14b8a6' // Blue for subtopic, Teal for details
      };
    });

    return result;
  }, [mindMap]);

  // Map links to lines with calculated coordinates
  const links = useMemo(() => {
    if (!mindMap || !mindMap.links || positionedNodes.length === 0) return [];

    return mindMap.links.map((link, idx) => {
      const sourceNode = positionedNodes[link.source];
      const targetNode = positionedNodes[link.target];

      if (!sourceNode || !targetNode) return null;

      return {
        id: `link-${idx}`,
        x1: sourceNode.x,
        y1: sourceNode.y,
        x2: targetNode.x,
        y2: targetNode.y,
        label: link.label
      };
    }).filter(Boolean);
  }, [mindMap, positionedNodes]);

  if (!mindMap || !mindMap.nodes || mindMap.nodes.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
        No mind map nodes generated.
      </div>
    );
  }

  return (
    <div className="mindmap-wrapper">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Draw Links */}
        {links.map(link => (
          <g key={link.id}>
            <line 
              x1={link.x1} 
              y1={link.y1} 
              x2={link.x2} 
              y2={link.y2} 
              className="mindmap-link"
            />
            {/* Draw optional relationship labels on the edges */}
            {link.label && (
              <text
                x={(link.x1 + link.x2) / 2}
                y={(link.y1 + link.y2) / 2 - 4}
                fill="var(--text-muted)"
                fontSize="8px"
                textAnchor="middle"
                opacity="0.75"
              >
                {link.label}
              </text>
            )}
          </g>
        ))}

        {/* Draw Nodes */}
        {Object.values(positionedNodes).map(node => (
          <g 
            key={node.id} 
            className="mindmap-node"
            transform={`translate(${node.x}, ${node.y})`}
            onClick={() => onNodeClick && onNodeClick(node.label)}
          >
            {/* Outer Glow Circle */}
            <circle 
              r={(node.val || 10) + 3} 
              fill={node.color} 
              opacity="0.15" 
              filter="url(#node-glow)"
            />
            {/* Inner Circle */}
            <circle 
              r={node.val || 10} 
              fill={node.color} 
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
            />
            {/* Label */}
            <text
              y={(node.val || 10) + 14}
              fill="var(--text-primary)"
              fontSize="10px"
              textAnchor="middle"
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                fontWeight: node.isRoot ? 'bold' : 'normal'
              }}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mindmap-tip">💡 Click on any concept node to research it in the AI Chat!</div>
    </div>
  );
}
