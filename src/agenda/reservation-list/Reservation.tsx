import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import XDate from 'xdate';
import * as dateUtils from '../../date.utils';
import styleConstructor from './style';
import { CalendarTheme, DateObject } from '../../types';
import { xdateToData } from '../../interface';

type StateReservation<T> = {
  reservation: T | null;
  date: XDate | false;
  day: XDate;
}

type Props<T> = {
  theme?: CalendarTheme;
  item: StateReservation<T>;
  renderItem: (item: T, isFirst: boolean) => JSX.Element;
  renderDay?: (day: DateObject | null, item: T | null) => JSX.Element;
  renderEmptyDate: (date: XDate | false) => JSX.Element;
  rowHasChanged: (r1: T, r2: T) => boolean;
}

const itemStyles = StyleSheet.create({
  contentContainer: {
    flex: 1
  }
});

class Reservation<T> extends React.Component<Props<T>> {
  static displayName = 'IGNORE';

  styles: {
    [k: string]: ViewStyle | TextStyle;
  }

  constructor(props: Props<T>) {
    super(props);
    this.styles = styleConstructor(props.theme);
  }

  shouldComponentUpdate(nextProps: Props<T>) {
    const r1 = this.props.item;
    const r2 = nextProps.item;
    let changed = true;
    if (!r1 && !r2) {
      changed = false;
    } else if (r1 && r2) {
      if (r1.day.getTime() !== r2.day.getTime()) {
        changed = true;
      } else if (!r1.reservation && !r2.reservation) {
        changed = false;
      } else if (r1.reservation && r2.reservation) {
        if ((!r1.date && !r2.date) || (r1.date && r2.date)) {
          changed = this.props.rowHasChanged(
            r1.reservation,
            r2.reservation
          );
        }
      }
    }

    return changed;
  }

  renderDate(date: XDate | false, item: T | null) {
    if (this.props.renderDay) {
      return this.props.renderDay(
        date
          ? xdateToData(date)
          : null,
        item
      );
    }
    const today = dateUtils.sameDate(date, new XDate())
      ? this.styles!.today
      : null;

    if (date) {
      return (
        <View style={ this.styles.day }>
          <Text
            allowFontScaling={ false }
            style={ [this.styles.dayNum, today] }>
            { date.getDate() }
          </Text>
          <Text
            allowFontScaling={ false }
            style={ [this.styles.dayText, today] }>
            { XDate
              .locales[XDate.defaultLocale]
              .dayNamesShort![date.getDay()] }
          </Text>
        </View>
      );
    }

    return (
      <View style={ this.styles.day } />
    );
  }

  render() {
    const { reservation, date } = this.props.item;
    let content;
    if (reservation) {
      const firstItem = !!date;
      content = this.props.renderItem(reservation, firstItem);
    } else {
      content = this.props.renderEmptyDate(date);
    }

    return (
      <View style={ this.styles.container }>
        { this.renderDate(date, reservation) }
        <View style={ itemStyles.contentContainer }>
          { content }
        </View>
      </View>
    );
  }
}

export default Reservation;
