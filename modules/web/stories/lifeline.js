import React from 'react';
import { storiesOf, action, linkTo } from '@kadira/storybook';
import CanvasDecorator from '../js/ballerina/components/canvas-decorator';
import LifeLine from '../js/ballerina/components/lifeline';
import components from '../js/ballerina/components/components';
import '../css/sequence_diagram/sequenced-styles.css';

storiesOf('LifeLine', module)
  .add('default view', () => {
    return (
      <CanvasDecorator>
          <LifeLine title="MyLifeLine" bBox={{x: 0, w: 375, h:320, y:0}}>
          </LifeLine>
      </CanvasDecorator>
    );
  });
