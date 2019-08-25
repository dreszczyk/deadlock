import React, { Component, Fragment } from 'react';
import styled from 'styled-components';
import { Typography, Button, notification, Row, Col, Divider, Badge } from 'antd';
import { QRCode } from 'react-qr-svg';
import { Link } from 'react-router-dom';
import _ from 'lodash';

import {
    Container,
} from '../components';

const { Title } = Typography;
const ButtonGroup = Button.Group;

const StyledContainer = styled(Container)`
    text-align: center;
`

const SmallTitle = styled.small`
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 10px;
    display: block;
`;

const PlayerState = styled.div`
    height: 200px;
    width: 200px;
    background-color: #dbe5ef;
    pointer-events: none;
    margin: 0 auto;
    line-height: 200px;
    text-align: center;
    margin-bottom: 5px;
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
        urlPrefix: window.location.origin,
    }

    componentDidUpdate() {
        console.log(this.state);
        
    }

    componentDidMount() {
        this.props.socket.emit('JOIN_ROOM', { roomName: this.state.roomName }, ({ status, roomName, errorMessage }) => {
            if (status === 'OK') {
                infoNotification(`Dołączono do pokoju ${roomName}!`)
            } else {
                this.props.history.push('/');
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

    getPlayerProfile = (playerNo) => {
        const isConnected = _.get(this.state, `players.player${playerNo}.connected`, false);
        const playerLink = `/joinGame/${this.state.roomName}/${playerNo}`;
        if (isConnected) {
            const ping = _.get(this.state, `players.player${playerNo}.ping`, 0);
            let pingColor = '#52c41a';
            if (ping > 20) {
                pingColor = '#ff8d3f'
            }
            if (ping > 50) {
                pingColor = '#ff3f3f'
            }
            return (
                <Fragment>
                    <Badge
                        count={ping}
                        showZero
                        style={{ backgroundColor: pingColor }}
                    >
                        <PlayerState>
                            połączony
                        </PlayerState>
                    </Badge>
                    <SmallTitle>gracz {playerNo}</SmallTitle>
                </Fragment>
            )
        }
        return (
            <Fragment>
                <Link to={playerLink} target='_blank'>
                    <QRCode
                        bgColor='#FFFFFF'
                        fgColor='#001529'
                        level='Q'
                        style={{ width: 200 }}
                        value={encodeURI(this.state.urlPrefix + playerLink)}
                    />
                </Link>
                <SmallTitle>gracz {playerNo}</SmallTitle>
            </Fragment>
        )
    }

    render() {
        return (
            <StyledContainer>
                <Title level={3} style={{ marginTop: '30px'}}>
                    <SmallTitle>jesteś w pokoju</SmallTitle>
                    {this.state.roomName}
                </Title>
                <Divider style={{ margin: '50px 0'}} />
                <Row>
                    <Col span={12}>
                        {this.getPlayerProfile(1)}
                    </Col>
                    <Col span={12} style={{ borderLeft: '1px solid #e8e8e8'}}>
                        {this.getPlayerProfile(2)}
                    </Col>
                </Row>
                <Divider style={{ margin: '50px 0 30px 0'}} />
                <ButtonGroup>
                    <Button icon='poweroff' onClick={() => { this.props.history.push('/') }}>
                        opuść pokój
                    </Button>
                </ButtonGroup>
            </StyledContainer>
        );
    }
}
export { Room };