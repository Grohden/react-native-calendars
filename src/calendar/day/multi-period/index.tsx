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
import {
  DayComponentProps,
  MultiPeriodMarking
} from '../../../types';

type MarkingOptions = MultiPeriodMarking & {
  // TODO: should this be on types?
  selected?: boolean;
  disabled?: boolean;
}

type Props = Omit<DayComponentProps, 'marking'> & {
  testID?: string;
  marking: MarkingOptions;
};

class MultiPeriodDay extends Component<Props> {
  static displayName = 'IGNORE';

  style: {
    [k: string]: ViewStyle | TextStyle;
  }

  constructor(props: Props) {
    super(props);
    this.style = styleConstructor(props.theme);
    this.onDayPress = this.onDayPress.bind(this);
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

  renderPeriods(marking: MarkingOptions) {
    const baseDotStyle = [this.style.dot, this.style.visibleDot];
    if (
      marking.periods &&
      Array.isArray(marking.periods) &&
      marking.periods.length > 0
    ) {
      // Filter out dots so that we we process only those items which have key and color property
      const validPeriods = marking.periods.filter(d => d && d.color);
      return validPeriods.map((period, index) => {
        const style = [
          ...baseDotStyle,
          {
            backgroundColor: period.color
          }
        ];
        if (period.startingDay) {
          style.push({
            borderTopLeftRadius: 2,
            borderBottomLeftRadius: 2,
            marginLeft: 4
          });
        }
        if (period.endingDay) {
          style.push({
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
            marginRight: 4
          });
        }
        return <View key={ index } style={ style } />;
      });
    }
    return;
  }

  render() {
    const containerStyle = [this.style.base];
    const textStyle = [this.style.text];

    const marking = this.props.marking || {};
    const periods = this.renderPeriods(marking);

    if (marking.selected) {
      containerStyle.push(this.style.selected);
      textStyle.push(this.style.selectedText);
    } else if (
      typeof marking.disabled !== 'undefined'
        ? marking.disabled
        : this.props.state === 'disabled'
    ) {
      textStyle.push(this.style.disabledText);
    } else if (this.props.state === 'today') {
      containerStyle.push(this.style.today);
      textStyle.push(this.style.todayText);
    }
    return (
      <View
        style={ {
          alignSelf: 'stretch'
        } }>
        <TouchableOpacity
          testID={ this.props.testID }
          style={ containerStyle }
          onPress={ this.onDayPress }
          onLongPress={ this.onDayLongPress }>
          <Text allowFontScaling={ false } style={ textStyle }>
            { String(this.props.children) }
          </Text>
        </TouchableOpacity>
        <View
          style={ {
            alignSelf: 'stretch'
          } }>
          { periods }
        </View>
      </View>
    );
  }
}

export default MultiPeriodDay;
