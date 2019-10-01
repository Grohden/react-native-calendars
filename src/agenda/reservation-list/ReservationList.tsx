import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControlProps,
  StyleSheet, TextStyle,
  View,
  ViewStyle
} from 'react-native';
import Reservation from './Reservation';
import XDate from 'xdate';

import * as dateUtils from '../../date.utils';
import styleConstructor from './style';
import { CalendarTheme, DateObject } from '../../types';

type Props<T> = {
  theme?: CalendarTheme;
  style?: ViewStyle;
  rowHasChanged: (r1: T, r2: T) => boolean;
  renderItem: (item: T) => JSX.Element;
  renderDay?: (day: DateObject | null, item: T | null) => JSX.Element;
  renderEmptyDate: () => JSX.Element;
  renderEmptyData: () => JSX.Element;
  onDayChange: (day: XDate) => void;
  onScroll: (offset: number) => void;
  reservations: {
    [k: string]: T[];
  };
  selectedDay: XDate;
  topDay: XDate;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

type StateReservation<T> = {
  reservation: T | null;
  date: XDate | false;
  day: XDate;
}

type State<T> = {
  reservations: StateReservation<T>[];
}

const styles = StyleSheet.create({
  defaultLoader: {
    marginTop: 80
  }
});

class ReservationList<T> extends React.Component<Props<T>, State<T>> {
  static displayName = 'IGNORE'

  list: FlatList<StateReservation<T>> | null = null

  styles: {
    [k: string]: ViewStyle | TextStyle;
  }

  heights: number[]

  selectedDay: XDate

  scrollOver: boolean

  constructor(props: Props<T>) {
    super(props);

    this.styles = styleConstructor(props.theme);
    this.state = {
      reservations: []
    };
    this.heights = [];
    this.selectedDay = this.props.selectedDay;
    this.scrollOver = true;
  }

  componentWillMount() {
    this.updateDataSource(this.getReservations(this.props).reservations);
  }

  updateDataSource(reservations: StateReservation<T>[]) {
    this.setState({
      reservations
    });
  }

  updateReservations(props: Props<T>) {
    const reservations = this.getReservations(props);
    if (this.list && !dateUtils.sameDate(props.selectedDay, this.selectedDay)) {
      let scrollPosition = 0;
      for (let i = 0; i < reservations.scrollPosition; i++) {
        scrollPosition += this.heights[i] || 0;
      }
      this.scrollOver = false;
      this.list.scrollToOffset({ offset: scrollPosition, animated: true });
    }
    this.selectedDay = props.selectedDay;
    this.updateDataSource(reservations.reservations);
  }

  componentWillReceiveProps(props: Props<T>) {
    if (!dateUtils.sameDate(props.topDay, this.props.topDay)) {
      this.setState({
        reservations: []
      }, () => {
        this.updateReservations(props);
      });
    } else {
      this.updateReservations(props);
    }
  }

  onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const yOffset = event.nativeEvent.contentOffset.y;
    this.props.onScroll(yOffset);
    let topRowOffset = 0;
    let topRow;

    for (topRow = 0; topRow < this.heights.length; topRow++) {
      if (topRowOffset + this.heights[topRow] / 2 >= yOffset) {
        break;
      }
      topRowOffset += this.heights[topRow];
    }

    const row = this.state.reservations[topRow];

    if (!row) {
      return;
    }

    const day = row.day;
    const sameDate = dateUtils.sameDate(day, this.selectedDay);

    if (!sameDate && this.scrollOver) {
      this.selectedDay = day.clone();
      this.props.onDayChange(day.clone());
    }
  }

  onRowLayoutChange(i: number, event: LayoutChangeEvent) {
    this.heights[i] = event.nativeEvent.layout.height;
  }

  renderRow({ item, index }: ListRenderItemInfo<StateReservation<T>>) {
    return (
      <View onLayout={ this.onRowLayoutChange.bind(this, index) }>
        <Reservation
          item={ item }
          renderItem={ this.props.renderItem }
          renderDay={ this.props.renderDay }
          renderEmptyDate={ this.props.renderEmptyDate }
          theme={ this.props.theme }
          rowHasChanged={ this.props.rowHasChanged }
        />
      </View>
    );
  }

  getReservationsForDay(iterator: XDate, props: Props<T>) {
    const day = iterator.clone();
    const res = props.reservations[day.toString('yyyy-MM-dd')];
    if (res && res.length) {
      return res.map((reservation, i) => ({
        reservation,
        date: i ? false : day,
        day
      } as const));
    }

    if (res) {
      return [{
        reservation: null,
        date: iterator.clone(),
        day
      }];
    }

    return false;
  }

  onListTouch() {
    this.scrollOver = true;
  }

  getReservations(props: Props<T>) {
    if (!props.reservations || !props.selectedDay) {
      return { reservations: [], scrollPosition: 0 };
    }

    let reservations: StateReservation<T>[] = [];
    if (this.state.reservations && this.state.reservations.length) {
      const iterator = this.state.reservations[0].day.clone();
      while (iterator.getTime() < props.selectedDay.getTime()) {
        const res = this.getReservationsForDay(iterator, props);
        if (!res) {
          reservations = [];
          break;
        } else {
          reservations = reservations.concat(res);
        }
        iterator.addDays(1);
      }
    }

    const scrollPosition = reservations.length;
    const iterator = props.selectedDay.clone();
    for (let i = 0; i < 31; i++) {
      const res = this.getReservationsForDay(iterator, props);
      if (res) {
        reservations = reservations.concat(res);
      }
      iterator.addDays(1);
    }

    return { reservations, scrollPosition };
  }

  render() {
    const res = this.props.reservations;
    const { selectedDay } = this.props;

    if (!res || !res[selectedDay.toString('yyyy-MM-dd')]) {
      if (this.props.renderEmptyData) {
        return this.props.renderEmptyData();
      }

      return (
        <ActivityIndicator
          style={ styles.defaultLoader }
          color={
            this.props.theme && this.props.theme.indicatorColor
          }
        />
      );
    }

    return (
      <FlatList
        ref={ c => this.list = c }
        style={ this.props.style }
        contentContainerStyle={ this.styles.content }
        renderItem={ this.renderRow.bind(this) }
        data={ this.state.reservations }
        onScroll={ this.onScroll.bind(this) }
        showsVerticalScrollIndicator={ false }
        scrollEventThrottle={ 200 }
        onMoveShouldSetResponderCapture={ () => {
          this.onListTouch();

          return false;
        } }
        keyExtractor={ (_, index) => String(index) }
        refreshControl={ this.props.refreshControl }
        refreshing={ this.props.refreshing || false }
        onRefresh={ this.props.onRefresh }
      />
    );
  }
}

export default ReservationList;
