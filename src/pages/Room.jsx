import React, { Component, Fragment } from 'react';
import styled from 'styled-components';
import { Typography, Button, notification, Row, Col } from 'antd';
import { QRCode } from 'react-qr-svg';
import { Link } from 'react-router-dom';
import _ from 'lodash';

import {
    Container,
} from '../components';

const { Title } = Typography;

const StyledContainer = styled(Container)`
    text-align: center;
`

const SmallTitle = styled.small`
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 10px;
    display: block;
`;

const BigTrigger = styled.div`
    width: 70%;
    height: 300px;
    background-color: red;
    pointer-events: none;
    margin: 0 auto;
    &:active,
    &.active {
        background-color: black;
    }
`;

const errorNotification = (message) => {
    notification.error({
        message,
    });
};

const infoNotification = (message) => {
    notification.info({ message });
};

class Room extends Component {
    state = {
        roomName: this.props.match.params.roomId || '?',
        players: {},
        player1Trigger: false,
        player2Trigger: false,
    }

    componentDidMount() {
        this.props.socket.emit('JOIN_ROOM', { roomName: this.state.roomName }, ({ status, roomName, errorMessage }) => {
            if (status === 'OK') {
                infoNotification(`Dołączono do pokoju ${roomName}!`)
            } else {
                errorNotification(errorMessage);
            }
        });
        this.props.socket.on('ROOM_UPDATE', (newRoomData) => {
            this.setState({ ...newRoomData })
        });
        this.props.socket.on('PLAYER_SHOT', (playerId) => {
            this.setState({
                [`player${playerId}Trigger`]: true,
            }, () => {
                setTimeout(() => {
                    this.setState({
                        [`player${playerId}Trigger`]: false,
                    })
                }, 100)
            });
        });
    }

    render() {
        const prefix = window.location.origin;
        const playerOneLink = `/joinGame/${this.state.roomName}/1`;
        const playerTwoLink = `/joinGame/${this.state.roomName}/2`;

        const playerOneProfile = _.get(this.state, 'players.player1.connected', false) ? (
            <Fragment>
                <Title level={4}>Połączony!</Title>
                <BigTrigger
                    className={this.state.player1Trigger && 'active'}
                />
            </Fragment>
        ) : (
            <Fragment>
                <Title level={4}>Dołącz jako gracz 1</Title>
                <Link to={playerOneLink} target='_blank'>
                    <QRCode
                        bgColor='#FFFFFF'
                        fgColor='#001529'
                        level='Q'
                        style={{ width: 256 }}
                        value={encodeURI(prefix + playerOneLink)}
                    />
                </Link>
            </Fragment>
        );

        const playerTwoProfile = _.get(this.state, 'players.player2.connected', false) ? (
            <Fragment>
                <Title level={4}>Połączony!</Title>
                <BigTrigger
                    className={this.state.player2Trigger && 'active'}
                />
            </Fragment>
        ) : (
            <Fragment>
                <Title level={4}>Dołącz jako gracz 2</Title>
                <Link to={playerTwoLink} target='_blank'>
                    <QRCode
                        bgColor='#FFFFFF'
                        fgColor='#001529'
                        level='Q'
                        style={{ width: 256 }}
                        value={encodeURI(prefix + playerTwoLink)}
                    />
                </Link>
            </Fragment>
        );
        return (
            <StyledContainer>
                <Title level={3}>
                    <SmallTitle>witaj w pokoju</SmallTitle>
                    {this.state.roomName}
                </Title>
                <Row>
                    <Col span={12}>
                        {playerOneProfile}
                    </Col>
                    <Col span={12}>
                        {playerTwoProfile}
                    </Col>
                </Row>
                <Button
                    onClick={() => {
                        this.props.history.push('/');
                    }}
                >
                    wyjdź
                </Button>
            </StyledContainer>
        );
    }
}
export { Room };