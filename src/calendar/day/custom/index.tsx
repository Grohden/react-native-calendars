import React, { Component } from 'react';
import {
  TouchableOpacity,
  Text,
  ViewStyle,
  TextStyle
} from 'react-native';

import styleConstructor from './style';
import { shouldUpdate } from '../../../component-updater';
import {
  CalendarTheme,
  CustomMarking,
  DateCallbackHandler,
  DateObject
} from '../../../types';

type MarkingOptions = Partial<CustomMarking> & {
  // TODO: should this be on types?
  selected?: boolean;
  disabled?: boolean;
  marking?: boolean;
  activeOpacity?: number;
  disableTouchEvent?: boolean;
}

// TODO: use this instead: DayComponentProps
type Props = {
  // TODO: disabled props should be removed
  state: 'selected' | 'disabled' | 'today';

  // Specify theme properties to override specific styles for calendar parts. Default = {}
  theme?: CalendarTheme;
  marking: MarkingOptions;
  onPress: DateCallbackHandler;
  onLongPress: DateCallbackHandler;
  date: DateObject;
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
    this.props.onPress(this.props.date);
  }

  onDayLongPress() {
    this.props.onLongPress(this.props.date);
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

    let marking = this.props.marking || {};

    //FIXME: Why is array validated here? marking should only be object.
    if (marking && marking.constructor === Array && (marking as []).length) {
      marking = {
        marking: true
      };
    }

    const isDisabled = typeof marking.disabled !== 'undefined'
      ? marking.disabled
      : this.props.state === 'disabled';

    if (marking.selected) {
      containerStyle.push(this.style.selected);
    } else if (isDisabled) {
      textStyle.push(this.style.disabledText);
    } else if (this.props.state === 'today') {
      containerStyle.push(this.style.today);
      textStyle.push(this.style.todayText);
    }

    if (marking.customStyles && typeof marking.customStyles === 'object') {
      const styles = marking.customStyles;
      if (styles.container) {
        if (styles.container.borderRadius === undefined) {
          styles.container.borderRadius = 16;
        }
        containerStyle.push(styles.container);
      }
      if (styles.text) {
        textStyle.push(styles.text);
      }
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
      </TouchableOpacity>
    );
  }
}

export default Day;