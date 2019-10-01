import React, { Component } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ViewStyle,
  TextStyle
} from 'react-native';
import { shouldUpdate } from '../../../component-updater';

import styleConstructor from './style';
import { CalendarTheme } from '../../../types';

// TODO: use this instead: DayComponentProps
type Props = {
  // TODO: disabled props should be removed
  state: 'disabled' | 'today';
  theme?: CalendarTheme;
  // TODO: type this
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marking: any;
  onPress?: (date: object) => void;
  onLongPress?: (date: object) => void;
  date?: object;
  testID?: string;
};

class Day extends Component<Props> {
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

  render() {
    const containerStyle = [this.style.base];
    const textStyle = [this.style.text];
    const dotStyle = [this.style.dot];

    let marking = this.props.marking || {};
    if (marking && marking.constructor === Array && marking.length) {
      marking = {
        marking: true
      };
    }
    const isDisabled = typeof marking.disabled !== 'undefined'
      ? marking.disabled
      : this.props.state === 'disabled';

    let dot;
    if (marking.marked) {
      dotStyle.push(this.style.visibleDot);
      if (isDisabled) {
        dotStyle.push(this.style.disabledDot);
      }
      if (marking.dotColor) {
        dotStyle.push({ backgroundColor: marking.dotColor });
      }
      dot = (<View style={ dotStyle } />);
    }

    if (marking.selected) {
      containerStyle.push(this.style.selected);
      if (marking.selectedColor) {
        containerStyle.push({ backgroundColor: marking.selectedColor });
      }
      dotStyle.push(this.style.selectedDot);
      textStyle.push(this.style.selectedText);
    } else if (isDisabled) {
      textStyle.push(this.style.disabledText);
    } else if (this.props.state === 'today') {
      containerStyle.push(this.style.today);
      textStyle.push(this.style.todayText);
      dotStyle.push(this.style.todayDot);
    }

    return (
      <TouchableOpacity
        testID={ this.props.testID }
        style={ containerStyle }
        onPress={ this.onDayPress }
        onLongPress={ this.onDayLongPress }
        activeOpacity={ marking.activeOpacity }
        disabled={ marking.disableTouchEvent }
      >
        <Text
          allowFontScaling={ false }
          style={ textStyle }>
          { String(this.props.children) }
        </Text>
        { dot }
      </TouchableOpacity>
    );
  }
}

export default Day;
