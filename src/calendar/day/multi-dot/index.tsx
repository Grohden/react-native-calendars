import React, { Component } from 'react';
import {
  TouchableOpacity,
  Text,
  View, ViewStyle, TextStyle
} from 'react-native';

import { shouldUpdate } from '../../../component-updater';

import styleConstructor from './style';
import {
  DayComponentProps,
  MultiDotMarking
} from '../../../types';

type Props = Omit<DayComponentProps, 'marking'> & {
  testID?: string;
  marking: MultiDotMarking;
};

class MultiDotDay extends Component<Props> {
  static displayName = 'IGNORE';

  style: {
    [k: string]: ViewStyle | TextStyle;
  }

  constructor(props: Props) {
    super(props);
    this.style = styleConstructor(props.theme);
    this.onDayPress = this.onDayPress.bind(this);
    this.onDayLongPress = this.onDayLongPress.bind(this);
  }

  onDayPress() {
    const { onPress, date } = this.props;

    if (onPress && date) {
      onPress(date);
    }
  }

  onDayLongPress() {
    const { onLongPress, date } = this.props;

    if (onLongPress && date) {
      onLongPress(date);
    }
  }

  shouldComponentUpdate(nextProps: Props) {
    return shouldUpdate(
      this.props,
      nextProps,
      ['state', 'children', 'marking', 'onPress', 'onLongPress']
    );
  }

  renderDots(marking: MultiDotMarking) {
    const baseDotStyle = [this.style.dot, this.style.visibleDot];
    if (marking.dots && Array.isArray(marking.dots) && marking.dots.length > 0) {
      // Filter out dots so that we we process only those items which have key and color property
      const validDots = marking.dots.filter(d => (d && d.color));
      return validDots.map((dot, index) => {
        return (
          <View key={ dot.key ? dot.key : index } style={ [baseDotStyle,
            { backgroundColor: marking.selected && dot.selectedDotColor ? dot.selectedDotColor : dot.color }] } />
        );
      });
    }
    return;
  }

  render() {
    const containerStyle = [this.style.base];
    const textStyle = [this.style.text];

    const marking = this.props.marking || {};
    const dot = this.renderDots(marking);

    if (marking.selected) {
      containerStyle.push(this.style.selected);
      textStyle.push(this.style.selectedText);
      if (marking.selectedColor) {
        containerStyle.push({ backgroundColor: marking.selectedColor });
      }
    } else if (typeof marking.disabled !== 'undefined' ? marking.disabled : this.props.state === 'disabled') {
      textStyle.push(this.style.disabledText);
    } else if (this.props.state === 'today') {
      containerStyle.push(this.style.today);
      textStyle.push(this.style.todayText);
    }

    return (
      <TouchableOpacity
        testID={ this.props.testID }
        style={ containerStyle }
        onPress={ this.onDayPress }
        onLongPress={ this.onDayLongPress }>
        <Text
          allowFontScaling={ false }
          style={ textStyle }>{ String(this.props.children) }</Text>
        <View style={ { flexDirection: 'row' } }>{ dot }</View>
      </TouchableOpacity>
    );
  }
}

export default MultiDotDay;
