import _ from 'lodash';
import React, { Component } from 'react';
import {
  Text,
  TextStyle,
  TouchableWithoutFeedback,
  View,
  ViewStyle
} from 'react-native';
import { shouldUpdate } from '../../../component-updater';

import * as defaultStyle from '../../../styles';
import styleConstructor from './style';
import {
  CalendarTheme,
  DateCallbackHandler,
  DateObject, PeriodMarking
} from '../../../types';

type DrawingStyle = {
  textStyle: TextStyle;
  containerStyle?: ViewStyle;
  rightFillerStyle?: string;
  leftFillerStyle?: string;
  startingDay?: { color?: string };
  endingDay?: { color?: string };
  day?: { color?: string };
}

type MarkingOptions = PeriodMarking & {
  // FIXME: should this be on types?
  quickAction?: boolean;
  first?: boolean;
  last?: boolean;
  endSelected?: boolean;
  status?: string;
}

type Props = {
  // TODO: selected + disabled props should be removed
  state: 'selected' | 'disabled' | 'today';

  // Specify theme properties to override specific styles for calendar parts. Default = {}
  theme?: CalendarTheme;
  testID?: string;
  marking: MarkingOptions;
  onPress?: DateCallbackHandler;
  onLongPress?: DateCallbackHandler;
  date?: DateObject;
  markingExists: boolean;
};

class Day extends Component<Props> {
  static displayName = 'IGNORE';

  theme: CalendarTheme

  markingStyle: DrawingStyle

  style: {
    [k: string]: ViewStyle | TextStyle;
  }

  constructor(props: Props) {
    super(props);
    this.theme = { ...defaultStyle, ...(props.theme || {}) };
    this.style = styleConstructor(props.theme);
    this.markingStyle = this.getDrawingStyle(props.marking || []);
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
    const newMarkingStyle = this.getDrawingStyle(nextProps.marking);

    // TODO: markingStyle should be stable so we can compare with ===
    if (!_.isEqual(this.markingStyle, newMarkingStyle)) {
      this.markingStyle = newMarkingStyle;
      return true;
    }

    return shouldUpdate(
      this.props,
      nextProps,
      ['state', 'children', 'onPress', 'onLongPress']
    );
  }

  getDrawingStyle(marking: MarkingOptions) {
    const defaultStyle: DrawingStyle = { textStyle: {} };
    if (!marking) {
      return defaultStyle;
    }

    defaultStyle.textStyle.color = (() => {
      if (marking.disabled) {
        return this.theme.textDisabledColor;
      }

      if (marking.selected) {
        return this.theme.selectedDayTextColor;
      }

      return undefined;
    })();

    // FIXME: reduce with single item?? its just a map using the styles...
    return ([marking]).reduce((prev, next) => {
      if (next.quickAction) {
        if (next.first || next.last) {
          prev.containerStyle = this.style.firstQuickAction;
          prev.textStyle = this.style.firstQuickActionText;
          if (next.endSelected && next.first && !next.last) {
            prev.rightFillerStyle = '#c1e4fe';
          } else if (next.endSelected && next.last && !next.first) {
            prev.leftFillerStyle = '#c1e4fe';
          }
        } else if (!next.endSelected) {
          prev.containerStyle = this.style.quickAction;
          prev.textStyle = this.style.quickActionText;
        } else if (next.endSelected) {
          prev.leftFillerStyle = '#c1e4fe';
          prev.rightFillerStyle = '#c1e4fe';
        }
        return prev;
      }

      const color = next.color;
      if (next.status === 'NotAvailable') {
        prev.textStyle = this.style.naText;
      }
      if (next.startingDay) {
        prev.startingDay = { color };
      }
      if (next.endingDay) {
        prev.endingDay = {
          color
        };
      }
      if (!next.startingDay && !next.endingDay) {
        prev.day = {
          color
        };
      }
      if (next.textColor) {
        prev.textStyle.color = next.textColor;
      }
      return prev;
    }, defaultStyle);
  }

  render() {
    const containerStyle = [this.style.base];
    const textStyle = [this.style.text];
    let leftFillerStyle: {
      backgroundColor?: string;
    } = {};
    let rightFillerStyle: {
      backgroundColor?: string;
    } = {};
    let fillerStyle = {};
    let fillers;

    if (this.props.state === 'disabled') {
      textStyle.push(this.style.disabledText);
    } else if (this.props.state === 'today') {
      containerStyle.push(this.style.today);
      textStyle.push(this.style.todayText);
    }

    if (this.props.marking) {
      containerStyle.push({
        borderRadius: 17
      });

      const flags = this.markingStyle;
      if (flags.textStyle) {
        textStyle.push(flags.textStyle);
      }
      if (flags.containerStyle) {
        containerStyle.push(flags.containerStyle);
      }
      if (flags.leftFillerStyle) {
        leftFillerStyle.backgroundColor = flags.leftFillerStyle;
      }
      if (flags.rightFillerStyle) {
        rightFillerStyle.backgroundColor = flags.rightFillerStyle;
      }

      if (flags.startingDay && !flags.endingDay) {
        leftFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        rightFillerStyle = {
          backgroundColor: flags.startingDay.color
        };
        containerStyle.push({
          backgroundColor: flags.startingDay.color
        });
      } else if (flags.endingDay && !flags.startingDay) {
        rightFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        leftFillerStyle = {
          backgroundColor: flags.endingDay.color
        };
        containerStyle.push({
          backgroundColor: flags.endingDay.color
        });
      } else if (flags.day) {
        leftFillerStyle = { backgroundColor: flags.day.color };
        rightFillerStyle = { backgroundColor: flags.day.color };
        // #177 bug
        fillerStyle = { backgroundColor: flags.day.color };
      } else if (flags.endingDay && flags.startingDay) {
        rightFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        leftFillerStyle = {
          backgroundColor: this.theme.calendarBackground
        };
        containerStyle.push({
          backgroundColor: flags.endingDay.color
        });
      }

      fillers = (
        <View style={ [this.style.fillers, fillerStyle] }>
          <View style={ [this.style.leftFiller, leftFillerStyle] } />
          <View style={ [this.style.rightFiller, rightFillerStyle] } />
        </View>
      );
    }

    return (
      <TouchableWithoutFeedback
        testID={ this.props.testID }
        onPress={ this.onDayPress }
        onLongPress={ this.onDayLongPress }>
        <View style={ this.style.wrapper }>
          { fillers }
          <View style={ containerStyle }>
            <Text allowFontScaling={ false }
              style={ textStyle }>{ String(this.props.children) }</Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

export default Day;
